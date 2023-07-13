$(document).ready(function () {
    let messages = [];
    let totalTokens = 0;
    let remainingTokens = 16000;
    let tokenRatio = 0.25;

    function updateTokenCounts() {
        let currentMessageSize = $('#input-field').val().length;
        let currentTokenCount = Math.ceil(currentMessageSize * tokenRatio);
        $('#current-token-count').text(currentTokenCount);
        $('#remaining-token-count').text(remainingTokens - totalTokens);
        $('#char-counter').text(`${currentMessageSize} characters`);
    }

    function formatMessage(message) {
        message = message.replace(/```([a-z]+)?([^`]*)```/gs, (_, lang, code) => {
            code = code.trim();
            let highlightedCode = hljs.highlightAuto(code, lang ? [lang] : undefined).value;
            return `<pre><code>${highlightedCode}</code></pre>`;
        });

        message = message.replace(/`([^`]*)`/gs, (matchedCode) => `<code>${matchedCode.slice(1, -1)}</code>`);

        return message;
    }

    function displayMessage(role, content) {
        let $messageDiv = $('<div></div>').addClass(`chat-message ${role}`);

        if (role === 'user') {
            $messageDiv.html(content);
            $messageDiv.append('<i class="fas fa-copy copy-icon"></i>');

            $messageDiv.find('.copy-icon').on('click', function (e) {
                e.preventDefault();
                let tempTextarea = document.createElement('textarea');
                tempTextarea.value = content;
                document.body.appendChild(tempTextarea);
                tempTextarea.select();
                document.execCommand('copy');
                document.body.removeChild(tempTextarea);
            });
        } else {
            $messageDiv.html(formatMessage(content));
        }

        $('#chat-messages').append($messageDiv);
    }

    $('#input-field').on('input', function () {
        updateTokenCounts();
        $('#input-field').attr('rows', $(this).val().split('\n').length || 1);
    });

    $('#send-button').click(() => {
        let userMessage = $('#input-field').val();
        let userTokens = Math.ceil(userMessage.length * tokenRatio);

        $('#input-field').val('');

        messages.push({ role: 'user', content: userMessage });

        displayMessage('user', userMessage);

        totalTokens += userTokens;

        sendMessageToAssistant(userMessage);

        updateTokenCounts();

        $('#chat-messages').scrollTop($('#chat-messages')[0].scrollHeight);
    });

    $('#upload-button').click(() => {
        let fileInput = document.getElementById('file-input');
        let file = fileInput.files[0];

        if (file) {
            let reader = new FileReader();

            reader.onload = function (e) {
                let fileContent = e.target.result;
                let userMessage = `Uploaded file: ${fileContent}`;
                let userTokens = Math.ceil(userMessage.length * tokenRatio);

                messages.push({ role: 'user', content: userMessage });

                displayMessage('user', userMessage);

                totalTokens += userTokens;

                updateTokenCounts();

                $('#chat-messages').scrollTop($('#chat-messages')[0].scrollHeight);
            };

            reader.readAsText(file);

            // Clear file input
            fileInput.value = '';
        }
    });

    function sendMessageToAssistant(userMessage) {
        if (totalTokens <= remainingTokens) {
            fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer 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'
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo-16k',
                    messages: messages,
                    max_tokens: Math.floor(remainingTokens - totalTokens),
                    temperature: 0.7
                })
            })
                .then((response) => response.json())
                .then((responseData) => {
                    if (responseData.choices) {
                        let assistantReply = responseData.choices[0].message.content.trim();
                        messages.push({ role: 'assistant', content: assistantReply });

                        totalTokens += Math.ceil(assistantReply.length * tokenRatio);

                        $('#total-token-count').text(Math.ceil(totalTokens));

                        displayMessage('bot', assistantReply);
                    } else {
                        $('#chat-messages').append(`<div class="chat-message bot">API error: ${responseData.error.message}</div>`);
                    }
                })
                .catch((error) => console.log(error));
        } else {
            $('#chat-messages').append(`<div class="chat-message bot">Token limit exceeded. Cannot send the message.</div>`);
        }
    }

    function clearChat() {
        messages = [];
        totalTokens = 0;
        remainingTokens = 16000;
        $('#chat-messages').empty();
        $('#total-token-count').text(totalTokens);
        $('#remaining-token-count').text(remainingTokens);
    }

    // Pagination
    function displayMessages(messages) {
        $('#chat-messages').empty();

        for (let i = 0; i < messages.length; i++) {
            let message = messages[i];
            let $messageDiv = $('<div></div>').addClass(`chat-message ${message.role}`);

            if (message.role === 'user') {
                $messageDiv.html(message.content);
                $messageDiv.append('<i class="fas fa-copy copy-icon"></i>');

                $messageDiv.find('.copy-icon').on('click', function (e) {
                    e.preventDefault();
                    let tempTextarea = document.createElement('textarea');
                    tempTextarea.value = message.content;
                    document.body.appendChild(tempTextarea);
                    tempTextarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(tempTextarea);
                });
            } else {
                $messageDiv.html(formatMessage(message.content));
            }

            $('#chat-messages').append($messageDiv);
        }
    }

    function paginateMessages(messages, page, pageSize) {
        let startIndex = (page - 1) * pageSize;
        let endIndex = startIndex + pageSize;
        return messages.slice(startIndex, endIndex);
    }

    let currentPage = 1;
    let pageSize = 10;
    let totalPages = Math.ceil(messages.length / pageSize);
    let currentMessages = paginateMessages(messages, currentPage, pageSize);

    displayMessages(currentMessages);

    function goToPage(page) {
        currentPage = page;
        currentMessages = paginateMessages(messages, currentPage, pageSize);
        displayMessages(currentMessages);
    }

    $('.pagination-prev').on('click', function () {
        if (currentPage > 1) {
            goToPage(currentPage - 1);
        }
    });

    $('.pagination-next').on('click', function () {
        if (currentPage < totalPages) {
            goToPage(currentPage + 1);
        }
    });

    // Chat History
    $('.chat-history-button').on('click', function () {
        $.get('/chat-history', function (response) {
            let $chatHistoryModal = $('#chat-history-modal');
            let $chatHistory = $('#chat-history');

            $chatHistory.empty();
            for (let i = 0; i < response.length; i++) {
                let message = response[i];
                let $message = $('<div></div>').addClass(`chat-history-message ${message.role}`).text(message.content);
                $chatHistory.append($message);
            }

            $chatHistoryModal.addClass('active');
        });
    });

    $('.modal-content .close-button').on('click', function () {
        $('#chat-history-modal').removeClass('active');
        $('#new-chat-modal').removeClass('active');
    });

    // New Chat
    $('.start-new-chat-button').on('click', function () {
        $('#new-chat-modal').addClass('active');
    });

    $('#new-chat-form').on('submit', function (e) {
        e.preventDefault();
        let username = $('#username').val();
        let password = $('#password').val();

        startNewChat(username, password);

        $('#new-chat-form')[0].reset();
        $('#new-chat-modal').removeClass('active');
    });

    function startNewChat(username, password) {
        clearChat();
        // Authenticate user here and start a new chat
        // ...

        // Simulating authentication and new chat start
        messages.push({ role: 'bot', content: `Welcome, ${username}! How can I assist you today?` });
        displayMessage('bot', `Welcome, ${username}! How can I assist you today?`);
        totalTokens += Math.ceil(`Welcome, ${username}! How can I assist you today?`.length * tokenRatio);
        $('#total-token-count').text(totalTokens);

        $('#chat-messages').scrollTop($('#chat-messages')[0].scrollHeight);
    }

    // Logout
    $('.logout-button').on('click', function () {
        clearChat();
        // Logout user and redirect to login page
        // ...
        window.location.href = '/logout';
    });
});
