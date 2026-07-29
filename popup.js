const toggle = document.querySelector("#dark-mode-toggle");
const status = document.querySelector("#status");
const postList = document.querySelector("#top-post-list");
const timeWindowButtons = document.querySelectorAll("[data-window]");
const postCountInput = document.querySelector("#post-count");
const DEFAULT_POST_COUNT = 5;
const MIN_POST_COUNT = 1;
const MAX_POST_COUNT = 30;
const DEFAULT_TIME_WINDOW = "12h";
const TIME_WINDOWS = {
  "12h": 12 * 60 * 60,
  "1d": 24 * 60 * 60,
};
let activeRequest;
let selectedPostCount = DEFAULT_POST_COUNT;
let selectedTimeWindow = DEFAULT_TIME_WINDOW;

function updateStatus(enabled) {
  status.textContent = `Dark mode is ${enabled ? "on" : "off"}`;
}

chrome.storage.sync.get(
  {
    enabled: true,
    topPostsCount: DEFAULT_POST_COUNT,
    topPostsTimeWindow: DEFAULT_TIME_WINDOW,
  },
  ({ enabled, topPostsCount, topPostsTimeWindow }) => {
    const timeWindow = TIME_WINDOWS[topPostsTimeWindow]
      ? topPostsTimeWindow
      : DEFAULT_TIME_WINDOW;
    const postCount = normalizePostCount(topPostsCount);

    toggle.checked = enabled;
    updateStatus(enabled);
    selectedPostCount = postCount;
    selectedTimeWindow = timeWindow;
    postCountInput.value = postCount;
    selectTimeWindow(timeWindow);
    loadTopPosts(timeWindow, postCount);
  },
);

function normalizePostCount(value) {
  const postCount = Number.parseInt(value, 10);
  if (!Number.isFinite(postCount)) {
    return DEFAULT_POST_COUNT;
  }

  return Math.min(MAX_POST_COUNT, Math.max(MIN_POST_COUNT, postCount));
}

function selectTimeWindow(timeWindow) {
  for (const button of timeWindowButtons) {
    button.setAttribute("aria-pressed", button.dataset.window === timeWindow);
  }
}

for (const button of timeWindowButtons) {
  button.addEventListener("click", () => {
    const timeWindow = button.dataset.window;
    selectedTimeWindow = timeWindow;
    selectTimeWindow(timeWindow);
    chrome.storage.sync.set({ topPostsTimeWindow: timeWindow });
    loadTopPosts(timeWindow, selectedPostCount);
  });
}

postCountInput.addEventListener("change", () => {
  const postCount = normalizePostCount(postCountInput.value);
  selectedPostCount = postCount;
  postCountInput.value = postCount;
  chrome.storage.sync.set({ topPostsCount: postCount });
  loadTopPosts(selectedTimeWindow, postCount);
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
    title.href = `https://news.ycombinator.com/item?id=${post.objectID}`;
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

async function loadTopPosts(timeWindow, postCount) {
  activeRequest?.abort();
  const request = new AbortController();
  activeRequest = request;
  const cutoff = Math.floor(Date.now() / 1000) - TIME_WINDOWS[timeWindow];
  const endpoint = new URL("https://hn.algolia.com/api/v1/search");
  endpoint.searchParams.set("tags", "story");
  endpoint.searchParams.set("numericFilters", `created_at_i>${cutoff}`);
  endpoint.searchParams.set("hitsPerPage", postCount);

  const loading = document.createElement("li");
  const loader = document.createElement("span");
  loading.className = "message";
  loader.className = "loader";
  loader.setAttribute("aria-hidden", "true");
  loading.append(loader, "Loading posts...");
  postList.replaceChildren(loading);

  try {
    const response = await fetch(endpoint, { signal: request.signal });
    if (!response.ok) {
      throw new Error(`HN API returned ${response.status}`);
    }

    const { hits } = await response.json();
    if (!Array.isArray(hits) || hits.length === 0) {
      throw new Error("HN API returned no posts");
    }

    renderPosts(hits);
  } catch (error) {
    if (error.name === "AbortError") {
      return;
    }

    const message = document.createElement("li");
    message.className = "message";
    message.textContent = "Posts unavailable.";
    postList.replaceChildren(message);
  } finally {
    if (activeRequest === request) {
      activeRequest = undefined;
    }
  }
}
