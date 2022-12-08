import Chart from "chart.js/auto";

const update_queue: Map<String, HTMLImageElement> = new Map();
let comments: Map<String, String> | null;

observer();

document.addEventListener("yt-navigate-finish", function (event: Event) {
    document.getElementById("sentiment-chart")?.remove();
    comments = null;

    const videoId = new URLSearchParams(window.location.search).get("v");
    if (videoId == null) return;

    const below = document.getElementById("below")!;

    const canvas: HTMLCanvasElement = document.createElement("canvas");
    // canvas.style.border = "1px solid black";
    canvas.width = below.clientWidth;
    canvas.id = "sentiment-chart";
    canvas.height = 25;

    below.insertBefore(canvas, below.querySelector("#comments"));

    fetch("http://localhost:8000/api/extension/youtube/" + videoId + "/")
        .then(response => response.json())
        .then(data => {
            comments = new Map(Object.entries(data["sentiments"]));

            update_queue.forEach((sentimentImage: HTMLImageElement, commentId: String) => {
                let sentiment = comments!.get(commentId);
                if (sentiment == null) sentiment = "unknown";

                sentimentImage.src = chrome.runtime.getURL("images/" + sentiment + "16.png");
            })

            initChart(canvas, data["counts"]);
        });
})

function initChart(canvas: HTMLCanvasElement, counts: { [_: string]: number; }) {
    new Chart(canvas, {
        type: 'bar',
        data: {
            labels: [''],
            datasets: [
                {
                    label: "Positive",
                    data: [counts["positive"]],
                    backgroundColor: "#00FF00"
                },
                {
                    label: "Negative",
                    data: [counts["negative"]],
                    backgroundColor: "#FF0000"
                },
                {
                    label: "Neutral",
                    data: [counts["neutral"]],
                    backgroundColor: "#9F9F9F"
                }
            ]
        },
        options: {
            indexAxis: "y",
            responsive: true,
            scales: {
                x: {
                    display: false,
                    stacked: true,
                    beginAtZero: true
                },
                y: {
                    display: false,
                    stacked: true,
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    displayColors: false
                }
            }
        }
    });
}

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

                if (comments == null) {
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
