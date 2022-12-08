observer();

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.status != "loading" || message.url == undefined) return;

    let path: string[] = new URL(message.url).pathname.split("/");
    if (path.length < 4 || path[2] != "status") return;
});

const sentiments = ["positive", "negative", "neutral"];

function observer() {
    const config = {childList: true, subtree: true};

    const observer = new MutationObserver(function (mutations: MutationRecord[], observer: MutationObserver) {
        let path: string[] = document.location.pathname.split("/");
        if (path.length < 4 || path[2] != "status") return;

        for (const mutation of mutations) {
            if (!(mutation.target instanceof Element)) continue;

            for (const addedNode of mutation.addedNodes) {
                if (!(addedNode instanceof Element)) continue;

                const tweet = addedNode.querySelector("article");
                if (tweet == null) continue;

                const link = tweet.querySelector("a>time")?.parentElement;
                if (link == null || link.getAttribute("href") === document.location.pathname) continue;

                const tweetText= tweet.querySelector("div[data-testid=\"tweetText\"]");
                if (tweetText == null || tweetText.textContent == null) continue;

                const icons = tweet.querySelector('[role="group"]');
                if (icons == null) continue;

                const image: HTMLImageElement = document.createElement("img");
                image.src = chrome.runtime.getURL("images/loading16.gif");
                image.id = "sentiment";

                icons.appendChild(image);

                fetch(`http://localhost:8000/api/extension/twitter/${encodeURIComponent(tweetText.textContent)}/`)
                    .then(response => response.text())
                    .then(data => {
                        if (!sentiments.includes(data)) data = "unknown";
                        image.src = chrome.runtime.getURL(`images/${data}16.png`)
                    });
            }
        }
    });

    observer.observe(document, config);
}
