(() => {
  const STORAGE_KEY = "gather-microblog-v1";
  const starterProfiles = [
    { id: "you", name: "Your account", handle: "@you", bio: "Making room for the little things.", following: ["maya", "alex"], color: "you" },
    { id: "maya", name: "Maya Chen", handle: "@mayamakes", bio: "Collecting small joys, one day at a time.", following: ["alex", "priya"], color: "maya" },
    { id: "alex", name: "Alex Rivera", handle: "@alexoutside", bio: "Fresh air enthusiast. Amateur cloud appreciator.", following: ["maya", "jordan"], color: "alex" },
    { id: "priya", name: "Priya Nair", handle: "@priyareads", bio: "Books, big ideas, and very good chai.", following: ["maya"], color: "priya" },
    { id: "jordan", name: "Jordan Lee", handle: "@jordansketches", bio: "Drawing what I see, learning as I go.", following: ["alex"], color: "jordan" },
    { id: "sam", name: "Sam Okafor", handle: "@samgrows", bio: "Growing things, in gardens and everywhere else.", following: [], color: "sam" },
  ];

  const initialPosts = [
    { id: "post-1", authorId: "maya", content: "Took the long way home today and found a tiny bookstore tucked between a bakery and a florist. It smelled like cinnamon and old paper. Perfect afternoon, honestly.", createdAt: Date.now() - 1000 * 60 * 18, likes: ["alex", "priya"] },
    { id: "post-2", authorId: "alex", content: "Morning walk report: one sleepy dog, three very determined pigeons, and the sky doing that soft pink thing again. I think I’ll take the scenic route tomorrow too 🌿", createdAt: Date.now() - 1000 * 60 * 74, likes: ["maya"] },
    { id: "post-3", authorId: "priya", content: "A line I underlined today: “There is no exquisite beauty without some strangeness in the proportion.” — Poe\n\nGoing to carry that one around for a while.", createdAt: Date.now() - 1000 * 60 * 60 * 5, likes: ["maya", "jordan", "alex"] },
    { id: "post-4", authorId: "jordan", content: "A little sketch from the window seat. Still figuring out the shadows, but I’m learning to enjoy the unfinished bits.", createdAt: Date.now() - 1000 * 60 * 60 * 22, likes: ["alex"] },
  ];

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.profiles) && Array.isArray(parsed.posts) && parsed.profiles.length) return parsed;
      }
    } catch (error) {
      console.warn("Could not load saved Gather data.", error);
    }
    return { profiles: starterProfiles.map(profile => ({ ...profile, following: [...profile.following] })), posts: initialPosts, activeId: "you" };
  }

  let state = loadState();
  if (!state.profiles.some(profile => profile.id === state.activeId)) state.activeId = state.profiles[0].id;
  let currentView = "home";
  let toastTimer;

  const $ = selector => document.querySelector(selector);
  const postList = $("#post-list");
  const postInput = $("#post-input");
  const postButton = $("#post-button");
  const charCount = $("#char-count");
  const emptyState = $("#empty-state");

  const activeProfile = () => state.profiles.find(profile => profile.id === state.activeId);
  const profileById = id => state.profiles.find(profile => profile.id === id);
  const initials = name => name.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("Could not save Gather data.", error);
      showToast("Your changes couldn't be saved in this browser.");
    }
  }

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("visible"), 2500);
  }

  function timeAgo(timestamp) {
    const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function renderProfile() {
    const profile = activeProfile();
    const avatarClass = `avatar-${profile.color || "you"}`;
    ["#sidebar-avatar", "#composer-avatar", "#profile-avatar", "#mobile-avatar"].forEach(selector => {
      const avatar = $(selector);
      avatar.textContent = initials(profile.name);
      avatar.className = `avatar ${avatarClass}${selector === "#profile-avatar" ? " profile-avatar" : ""}`;
    });
    $("#sidebar-name").textContent = profile.name;
    $("#sidebar-handle").textContent = profile.handle;
    $("#profile-name").textContent = profile.name;
    $("#profile-handle").textContent = profile.handle;
    $("#profile-bio").textContent = profile.bio;
    $("#following-count").textContent = profile.following.length;
    $("#followers-count").textContent = state.profiles.filter(person => person.following.includes(profile.id)).length;
  }

  function visiblePosts() {
    if (currentView === "profile") return state.posts.filter(post => post.authorId === state.activeId);
    if (currentView === "discover") return state.posts.filter(post => post.authorId !== state.activeId && !activeProfile().following.includes(post.authorId));
    const followedIds = [...activeProfile().following, state.activeId];
    return state.posts.filter(post => followedIds.includes(post.authorId));
  }

  function postMarkup(post) {
    const author = profileById(post.authorId);
    if (!author) return "";
    const liked = post.likes.includes(state.activeId);
    return `<article class="post-card card">
      <header class="post-header">
        <span class="avatar avatar-${escapeHtml(author.color)}">${escapeHtml(initials(author.name))}</span>
        <div class="post-author"><strong>${escapeHtml(author.name)}</strong><span>${escapeHtml(author.handle)}</span></div>
        <time class="post-time" datetime="${new Date(post.createdAt).toISOString()}">${timeAgo(post.createdAt)}</time>
        ${currentView === "discover" ? `<button class="post-follow-button" data-follow-id="${escapeHtml(author.id)}">Follow</button>` : ""}
        <button class="post-more" aria-label="More options" title="More options">···</button>
      </header>
      <p class="post-content">${escapeHtml(post.content)}</p>
      <footer class="post-actions">
        <button class="post-action like-button${liked ? " liked" : ""}" data-post-id="${escapeHtml(post.id)}" aria-label="${liked ? "Unlike" : "Like"} this post">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 8.7c0 4.2-8.8 10-8.8 10s-8.8-5.8-8.8-10a4.6 4.6 0 0 1 8.8-1.8 4.6 4.6 0 0 1 8.8 1.8Z"/></svg>
          <span>${post.likes.length || "Like"}</span>
        </button>
        <button class="post-action share-button" data-post-id="${escapeHtml(post.id)}" aria-label="Share this post">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3m0 0L7 8m5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>
          <span>Share</span>
        </button>
      </footer>
    </article>`;
  }

  function renderFeed() {
    const profile = activeProfile();
    const isHome = currentView === "home";
    const isDiscover = currentView === "discover";
    $("#page-title").textContent = isHome ? "Home" : isDiscover ? "Discover" : profile.name;
    $("#eyebrow").textContent = isHome ? "YOUR LITTLE CORNER" : isDiscover ? "A WORLD OF THOUGHTS" : "YOUR SPACE";
    $("#feed-label").textContent = isHome ? "From your people" : isDiscover ? "A little bit of everything" : "Your posts";
    $("#feed-label-icon").textContent = isHome ? "✳" : isDiscover ? "⌕" : "◌";
    $("#feed-meta").textContent = isHome ? "Following" : "";
    $("#composer").classList.toggle("hidden", isDiscover);
    const posts = visiblePosts().sort((a, b) => b.createdAt - a.createdAt);
    postList.innerHTML = posts.map(postMarkup).join("");
    postList.classList.toggle("hidden", posts.length === 0);
    emptyState.classList.toggle("hidden", posts.length !== 0);

    if (posts.length === 0 && isHome) {
      $("#empty-title").textContent = "Your feed is a blank canvas";
      $("#empty-copy").textContent = "Follow a few people to see their thoughts here. Good things start with a hello.";
      $("#empty-action").textContent = "Find your people ↗";
      $("#empty-action").dataset.view = "discover";
    } else if (posts.length === 0 && isDiscover) {
      $("#empty-title").textContent = "It's quiet around here";
      $("#empty-copy").textContent = "New posts from people you don't follow will show up here.";
      $("#empty-action").textContent = "Back to home ↗";
      $("#empty-action").dataset.view = "home";
    } else if (posts.length === 0) {
      $("#empty-title").textContent = "Your story starts here";
      $("#empty-copy").textContent = "Share a little thought with your people. No pressure, just you.";
      $("#empty-action").textContent = "Write a post ↗";
      delete $("#empty-action").dataset.view;
    }
    renderProfile();
  }

  function renderSuggestions() {
    const profile = activeProfile();
    const suggestions = state.profiles.filter(person => person.id !== profile.id && !profile.following.includes(person.id));
    $("#suggestion-list").innerHTML = suggestions.length
      ? suggestions.slice(0, 4).map(person => `<div class="suggestion">
          <span class="avatar avatar-${escapeHtml(person.color)}">${escapeHtml(initials(person.name))}</span>
          <div class="suggestion-info"><strong>${escapeHtml(person.name)}</strong><span>${escapeHtml(person.handle)}</span></div>
          <button class="follow-button" data-follow-id="${escapeHtml(person.id)}" aria-label="Follow ${escapeHtml(person.name)}" title="Follow">+</button>
        </div>`).join("")
      : `<p class="suggestion-empty">You're following everyone here. Lovely.</p>`;
  }

  function render() {
    renderFeed();
    renderSuggestions();
    document.querySelectorAll(".nav-link[data-view]").forEach(button => button.classList.toggle("active", button.dataset.view === currentView));
  }

  function switchView(view) {
    currentView = view;
    render();
    if (window.innerWidth <= 700) window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleFollow(profileId) {
    const profile = activeProfile();
    const index = profile.following.indexOf(profileId);
    if (index >= 0) {
      profile.following.splice(index, 1);
      showToast(`You're no longer following ${profileById(profileId).name}.`);
    } else {
      profile.following.push(profileId);
      showToast(`You're now following ${profileById(profileId).name}.`);
    }
    saveState();
    render();
  }

  function setAccount(profileId) {
    state.activeId = profileId;
    saveState();
    render();
    showToast(`Switched to ${activeProfile().name}.`);
  }

  document.querySelectorAll(".nav-link[data-view], [data-view]").forEach(button => {
    button.addEventListener("click", event => {
      if (event.currentTarget.dataset.view) switchView(event.currentTarget.dataset.view);
    });
  });
  $("#empty-action").addEventListener("click", event => {
    if (event.currentTarget.dataset.view) switchView(event.currentTarget.dataset.view);
    else {
      switchView("home");
      postInput.focus();
    }
  });
  $("#sidebar-compose").addEventListener("click", () => {
    switchView("home");
    postInput.focus();
  });
  $("#account-switcher").addEventListener("click", () => {
    const options = state.profiles.map((profile, index) => `${index + 1}. ${profile.name} (${profile.handle})`).join("\n");
    const answer = window.prompt(`Switch account — enter a number:\n${options}`, String(state.profiles.findIndex(profile => profile.id === state.activeId) + 1));
    if (answer === null || answer.trim() === "") return;
    const chosen = state.profiles[Number(answer) - 1];
    if (!chosen) {
      showToast("Choose one of the account numbers shown.");
      return;
    }
    setAccount(chosen.id);
  });
  $("#mobile-account").addEventListener("click", () => $("#account-switcher").click());
  $("#suggestion-list").addEventListener("click", event => {
    const button = event.target.closest("[data-follow-id]");
    if (button) toggleFollow(button.dataset.followId);
  });
  postList.addEventListener("click", event => {
    const followButton = event.target.closest("[data-follow-id]");
    if (followButton) {
      toggleFollow(followButton.dataset.followId);
      return;
    }
    const likeButton = event.target.closest(".like-button");
    if (likeButton) {
      const post = state.posts.find(item => item.id === likeButton.dataset.postId);
      if (!post) return;
      const index = post.likes.indexOf(state.activeId);
      if (index >= 0) post.likes.splice(index, 1);
      else post.likes.push(state.activeId);
      saveState();
      renderFeed();
      return;
    }
    const shareButton = event.target.closest(".share-button");
    if (shareButton) {
      const post = state.posts.find(item => item.id === shareButton.dataset.postId);
      const text = `${post.content}\n— ${profileById(post.authorId).name}`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => showToast("Post copied to your clipboard.")).catch(() => showToast("Couldn't copy this post."));
      } else {
        showToast("Clipboard sharing isn't available in this browser.");
      }
    }
  });
  postInput.addEventListener("input", () => {
    const length = postInput.value.length;
    charCount.textContent = `${length} / 280`;
    charCount.classList.toggle("near-limit", length > 250);
    postButton.disabled = postInput.value.trim().length === 0;
  });
  postButton.addEventListener("click", () => {
    const content = postInput.value.trim();
    if (!content) return;
    state.posts.push({ id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, authorId: state.activeId, content, createdAt: Date.now(), likes: [] });
    saveState();
    postInput.value = "";
    charCount.textContent = "0 / 280";
    postButton.disabled = true;
    switchView("home");
    showToast("Your thought is out there. ✳");
  });

  render();
})();
