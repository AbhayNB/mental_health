// for voice output

var synthesis = window.speechSynthesis;
var maleVoice = null;
var femaleVoice = null;

// Set voices during page initialization
window.onload = function () {
  updateVoices();
};

function updateVoices() {
  var voices = synthesis.getVoices();

  // Filter voices based on gender
  var filteredMaleVoices = voices.filter(function (voice) {
    return voice.voiceURI.includes("Male"); // Modify the condition based on the male voice URI
  });

  var filteredFemaleVoices = voices.filter(function (voice) {
    return voice.voiceURI.includes("Female"); // Modify the condition based on the female voice URI
  });

  if (filteredMaleVoices.length > 0) {
    maleVoice = filteredMaleVoices[0];
  } else {
    console.warn("Male voice not found");
  }

  if (filteredFemaleVoices.length > 0) {
    femaleVoice = filteredFemaleVoices[0];
  } else {
    console.warn("Female voice not found");
  }
}

window.speechSynthesis.onvoiceschanged = function () {
  updateVoices();
};

function speakWithSelectedVoice(reply, gender) {
  var utterance = new SpeechSynthesisUtterance(reply);
  utterance.lang = "en-US"; // Set the language of the speech

  if (gender === "Male" && maleVoice) {
    utterance.voice = maleVoice;
  } else if (gender === "Female" && femaleVoice) {
    utterance.voice = femaleVoice;
  } else {
    console.warn("Selected voice not available");
    return;
  }

  synthesis.speak(utterance);
}

// to track mic button status
var isMicButtonPressed = false;

function startSpeechRecognition() {
  const recognition = new webkitSpeechRecognition() || SpeechRecognition();
  recognition.lang = "en-US";

  recognition.start();
  document.getElementById("further-chat-mic-button").classList.add("listening");
  document.getElementById("speech-message").textContent = "Listening...";

  recognition.onresult = function (event) {
    const transcript = event.results[0][0].transcript;
    document.getElementById("doctor_input").value = transcript;
    recognition.stop();
    document
      .getElementById("further-chat-mic-button")
      .classList.remove("listening");
    document.getElementById("speech-message").textContent = "";

    isMicButtonPressed = true;
    event.preventDefault();
    $("#further-chat-form").submit();
  };

  recognition.onerror = function (event) {
    console.error("Speech recognition error:", event.error);
    recognition.stop();
    document
      .getElementById("further-chat-mic-button")
      .classList.remove("listening");
    document.getElementById("speech-message").textContent =
      "Could not understand. Please try again.";
    isMicButtonPressed = false;
    setTimeout(function() {
      document.getElementById("speech-message").textContent = "";
    }, 3000); // Remove message after 3 seconds (3000 milliseconds)
  };
}

// Adding microphone icon dynamically
const micButton = document.getElementById("further-chat-mic-button");
const micIcon = document.createElement("i");
micIcon.classList.add("fa", "fa-microphone");
micButton.appendChild(micIcon);

var imageUrls = {
  0: "static/images/Examiner.png",

  1: "static/images/FemaleNone.png",
  2: "static/images/FemaleMild.png",
  3: "static/images/FemaleModerate.png",
  4: "static/images/FemaleSevere.png",

  5: "static/images/MaleNone.png",
  6: "static/images/MaleMild.png",
  7: "static/images/MaleModerate.png",
  8: "static/images/MaleSevere.png",
};

var index = 1; // image index for avatars
var gender = "Male";

$(document).ready(function () {
  // 1
  $("#chat-form").submit(function (event) {
    event.preventDefault();
    var condition = $("#condition").val();
    var severity = $("#severity").val();
    gender = $("#gender").val();
    var chatLog = $("#chat-log");

    if (!condition || !severity) {
      alert("Please provide the health condition and severity properly.");
      return;
    }

    if (gender == "Male") index = 5;
    else index = 1;

    if (severity == "Mild") index++;
    else if (severity == "Moderate") index += 2;
    else if (severity == "Severe") index += 3;

    clearChat();

    $.ajax({
      type: "POST",
      url: "/chat",
      data: { condition: condition, severity: severity, gender: gender },
      success: function (data) {
        var replyLines = data.reply.split("\n");

        var userMessage = $('<div class="message user-message">').text(
          replyLines
        );
        userMessage
          .hide()
          .appendTo(chatLog)
          .fadeIn()
          .delay(500)
          .fadeOut(function () {
            $(this).remove();
          });

        setTimeout(function () {
          $("#further-chat-form").removeClass("d-none");
          $("#further-chat-form").focus();
        }, 1000);
      },
    });
  });

  // 2
  $("#doctor_input").keydown(function (event) {
    if (event.keyCode === 13 && !event.shiftKey) {
      event.preventDefault();
      $("#further-chat-form").submit();
    }
  });

  $("#further-chat-form").submit(function (event) {
    event.preventDefault();

    var doctor_input = $("#doctor_input").val();
    var chatLog = $("#chat-log");

    if (!doctor_input) {
      alert("Please enter your message.");
      return;
    }

    chatLog.append(
      '<div class="message user-message"> <img src="' +
        imageUrls[0] +
        '" alt="Examiner Image" class="user-image"> <strong>Examiner : </strong> ' +
        doctor_input +
        "</div>"
    );

    $.ajax({
      type: "POST",
      url: "/chat_further",
      data: {
        doctor_input: doctor_input,
      },
      success: function (response) {
        // console.log(response)
        var reply = response.reply;
        

        reply = reply.replace(/^[A-Za-z0-9]+\:\s+/gm, ""); // Removing bullet points
        reply = reply.replace(/\n/g, " "); // Replacing line breaks with spaces

        // text to voice if mic button pressed
        if (isMicButtonPressed) {
          speakWithSelectedVoice(reply, gender);
        }

        console.log(index);

        chatLog.append(
          '<div class="message bot-message ml-auto"><img src="' +
            imageUrls[index] +
            '" alt="Bot Image" class="bot-image"><strong> </strong>' +
            reply +
            "</div>"
        );

        $("#doctor_input").val(""); // Clear the user input textarea
        chatLog.scrollTop(chatLog[0].scrollHeight);
        isMicButtonPressed = false;
      },
    });
  });

  // 3 Clear the chat log
  function clearChat() {
    $.post("/reset_conversation", function (data) {
      // Handle the response if needed
      console.log(data.message);
    });
    isMicButtonPressed = false;
    $("#chat-log").empty();
    $("#further-chat-form").addClass("d-none");
  }
  $("#clear-chat-btn").click(function () {
    clearChat();
  });
});
