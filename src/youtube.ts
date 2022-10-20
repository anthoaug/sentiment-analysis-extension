import "./background"

const update_queue: Map<String, HTMLImageElement> = new Map();
let comments: Map<String, String>;

document.addEventListener("yt-navigate-finish", function (event: Event) {
    const videoId = new URLSearchParams(window.location.search).get("v");
    if (videoId == null) return;

    observer();

    fetch("http://localhost:8000/extension/youtube/" + videoId + "/")
        .then(response => response.json())
        .then(data => {
            comments = new Map(Object.entries(data));

            update_queue.forEach((sentimentImage: HTMLImageElement, commentId: String) => {
                let sentiment = comments.get(commentId);
                if (sentiment == null) sentiment = "unknown";

                sentimentImage.src = chrome.runtime.getURL("images/" + sentiment + "16.png");
            })
        });
})

function observer() {
    const config = {childList: true, subtree: true};

    const observer = new MutationObserver(function (mutations: MutationRecord[], observer: MutationObserver) {
        for (const mutation of mutations) {
            if (!(mutation.target instanceof Element && mutation.target.id == "contents")) continue;

            for (const addedNode of mutation.addedNodes) {
                if (!(addedNode instanceof Element)) continue;

                const time = addedNode.querySelector(".published-time-text>a");
                if (time == null) continue;

                const timeLink = time.getAttribute("href");
                if (timeLink == null) continue;

                const commentId = (new URLSearchParams(timeLink)).get("lc");
                if (commentId == null) continue;

                const toolbar = addedNode.querySelector("#toolbar");
                if (toolbar == null || toolbar.querySelector("#sentiment") != null) continue;

                const image: HTMLImageElement = document.createElement("img");
                image.id = "sentiment";
                image.classList.add("style-scope", "ytd-comment-action-buttons-renderer");

                if (comments == undefined) {
                    image.src = chrome.runtime.getURL("images/loading16.gif");
                    update_queue.set(commentId, image);
                } else {
                    let sentiment = comments.get(commentId);
                    if (sentiment == null) sentiment = "unknown";

                    image.src = chrome.runtime.getURL("images/" + sentiment + "16.png");
                }

                toolbar.appendChild(image);
            }
        }
    });

    observer.observe(document, config);
}

