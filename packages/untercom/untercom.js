(function () {
  let url, publicId;

  function createUntercomWidget(widgetUrl, widgetPublicId) {
    url = widgetUrl;
    publicId = widgetPublicId;

    const widget = document.createElement('div');
    widget.id = 'untercom-widget';
    widget.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      background-color: #007bff;
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;

    widget.innerHTML = `
      <svg viewBox="0 0 28 32" width="28" height="32" fill="#fff" style="margin: 14px 16px;">
        <path d="M28 32s-4.714-1.855-8.527-3.34H3.437C1.54 28.66 0 27.026 0 25.013V3.644C0 1.633 1.54 0 3.437 0h21.125c1.898 0 3.437 1.632 3.437 3.645v18.404H28V32zm-4.139-11.982a.88.88 0 00-1.292-.105c-.03.026-3.015 2.681-8.57 2.681-5.486 0-8.517-2.636-8.571-2.684a.88.88 0 00-1.29.107 1.01 1.01 0 00-.219.708.992.992 0 00.318.664c.142.128 3.537 3.15 9.762 3.15 6.226 0 9.621-3.022 9.763-3.15a.992.992 0 00.317-.664 1.01 1.01 0 00-.218-.707z"/>
      </svg>
    `;

    widget.addEventListener('click', toggleChat);

    document.body.appendChild(widget);
    createChatWidget();
  }

  function createChatWidget() {
    const chatWidget = document.createElement('div');
    chatWidget.id = 'untercom-chat-widget';
    chatWidget.style.cssText = `
      position: fixed;
      bottom: 100px;
      right: 20px;
      width: 300px;
      height: 400px;
      background-color: white;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      display: none;
      flex-direction: column;
      overflow: hidden;
    `;

    chatWidget.innerHTML = `
      <div id="messages" style="flex-grow: 1; overflow-y: auto; padding: 10px;"></div>
      <form id="messageForm" style="display: flex; padding: 10px;">
        <input type="text" id="messageInput" placeholder="Type your message..." style="flex-grow: 1; margin-right: 10px;">
        <button type="submit">Send</button>
      </form>
    `;

    document.body.appendChild(chatWidget);

    const form = chatWidget.querySelector('#messageForm');
    const input = chatWidget.querySelector('#messageInput');
    const messages = chatWidget.querySelector('#messages');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (input.value) {
        sendMessage(input.value);
        input.value = '';
      }
    });

    window.addMessage = (message) => {
      const messageElement = document.createElement('p');
      messageElement.textContent = message;
      messages.appendChild(messageElement);
      messages.scrollTop = messages.scrollHeight;
    };
  }

  function toggleChat() {
    const chatWidget = document.getElementById('untercom-chat-widget');
    chatWidget.style.display =
      chatWidget.style.display === 'none' ? 'flex' : 'none';
  }

  async function sendMessage(message) {
    try {
      const response = await fetch(`${url}/public-widget/message/${publicId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://app.untercom.com'
        },
        body: JSON.stringify({
          message: message,
          name: 'Website Visitor',
          email: 'visitor@example.com'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      console.log('Response:', response);

      const result = await response.json();
      if (result.success) {
        addMessage(`You: ${message}`);
      } else {
        throw new Error('Message not sent successfully');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      addMessage(`Error: ${error.message}`);
    }
  }

  window.untercom = {
    init: function (widgetUrl, widgetPublicId) {
      if (!widgetUrl || !widgetPublicId) {
        console.error('Untercom: URL and publicId are required');
        return;
      }
      createUntercomWidget(widgetUrl, widgetPublicId);
    },
    sendMessage: sendMessage
  };
})();
