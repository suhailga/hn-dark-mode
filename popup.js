const toggle = document.querySelector("#dark-mode-toggle");
const status = document.querySelector("#status");
const postList = document.querySelector("#top-post-list");
const TOP_POST_COUNT = 3;
const ONE_DAY_IN_SECONDS = 24 * 60 * 60;

function updateStatus(enabled) {
  status.textContent = `Dark mode is ${enabled ? "on" : "off"}`;
}

chrome.storage.sync.get({ enabled: true }, ({ enabled }) => {
  toggle.checked = enabled;
  updateStatus(enabled);
});

toggle.addEventListener("change", () => {
  const enabled = toggle.checked;
  updateStatus(enabled);
  chrome.storage.sync.set({ enabled });
});

function formatRatio(points, comments) {
  if (comments === 0) {
    return points === 0 ? "0x" : "∞";
  }

  return `${(points / comments).toFixed(1)}x`;
}

function renderPosts(posts) {
  const rows = posts.map((post) => {
    const points = post.points || 0;
    const comments = post.num_comments || 0;
    const row = document.createElement("li");
    const votes = document.createElement("span");
    const title = document.createElement("a");
    const ratio = document.createElement("span");

    votes.className = "post-votes";
    votes.textContent = points.toLocaleString();
    votes.title = `${points} upvotes`;

    title.className = "post-title";
    title.href = post.url || `https://news.ycombinator.com/item?id=${post.objectID}`;
    title.target = "_blank";
    title.rel = "noreferrer";
    title.textContent = post.title;

    ratio.className = "post-ratio";
    ratio.textContent = formatRatio(points, comments);
    ratio.title = `${points} upvotes / ${comments} comments`;

    row.append(votes, title, ratio);
    return row;
  });

  postList.replaceChildren(...rows);
}

async function loadTopPosts() {
  const cutoff = Math.floor(Date.now() / 1000) - ONE_DAY_IN_SECONDS;
  const endpoint = new URL("https://hn.algolia.com/api/v1/search");
  endpoint.searchParams.set("tags", "story");
  endpoint.searchParams.set("numericFilters", `created_at_i>${cutoff}`);
  endpoint.searchParams.set("hitsPerPage", TOP_POST_COUNT);

  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`HN API returned ${response.status}`);
    }

    const { hits } = await response.json();
    if (!Array.isArray(hits) || hits.length === 0) {
      throw new Error("HN API returned no posts");
    }

    renderPosts(hits);
  } catch {
    const message = document.createElement("li");
    message.className = "message";
    message.textContent = "Posts unavailable.";
    postList.replaceChildren(message);
  }
}

loadTopPosts();
