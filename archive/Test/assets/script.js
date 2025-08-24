
document.addEventListener("DOMContentLoaded", function () {
  const categoryList = document.getElementById("categoryList");
  const postContent = document.getElementById("postContent");
  const searchInput = document.getElementById("searchInput");
  const tocList = document.getElementById("tocList");

  let postsByCategory = {};

  function renderTOC() {
    tocList.innerHTML = "";
    const headers = postContent.querySelectorAll("h2, h3");
    headers.forEach((header, index) => {
      const id = "heading-" + index;
      header.id = id;
      const li = document.createElement("li");
      const link = document.createElement("a");
      link.href = "#" + id;
      link.textContent = header.textContent;
      li.appendChild(link);
      tocList.appendChild(li);
    });
  }

  function loadPost(path, title) {
    fetch(path)
      .then(res => res.text())
      .then(md => {
        postContent.innerHTML = "<h1>" + title + "</h1>" + marked.parse(md);
        renderTOC();
      });
  }

  function renderCategoryList() {
    categoryList.innerHTML = "";
    for (const category in postsByCategory) {
      postsByCategory[category].forEach(post => {
        const li = document.createElement("li");
        li.className = "nav-item";
        const link = document.createElement("a");
        link.className = "nav-link";
        link.href = "#";
        link.textContent = post.title;
        link.onclick = () => loadPost(post.path, post.title);
        li.appendChild(link);
        categoryList.appendChild(li);
      });
    }
  }

  function searchPosts(query) {
    categoryList.innerHTML = "";
    for (const category in postsByCategory) {
      postsByCategory[category].forEach(post => {
        if (post.title.toLowerCase().includes(query)) {
          const li = document.createElement("li");
          li.className = "nav-item";
          const link = document.createElement("a");
          link.className = "nav-link";
          link.href = "#";
          link.textContent = post.title;
          link.onclick = () => loadPost(post.path, post.title);
          li.appendChild(link);
          categoryList.appendChild(li);
        }
      });
    }
  }

  const postsJsonPath = location.pathname.includes('/posts/') ? '../assets/posts.json' : 'assets/posts.json';
  fetch(postsJsonPath)
    .then(res => res.json())
    .then(posts => {
      postsByCategory = posts.reduce((acc, post) => {
        if (!acc[post.category]) acc[post.category] = [];
        acc[post.category].push(post);
        return acc;
      }, {});
      renderCategoryList();
    });

  searchInput.addEventListener("input", function () {
    searchPosts(this.value.toLowerCase());
  });

  // Dark Mode Toggle
  const toggleButton = document.getElementById("toggleTheme");
  const userPref = localStorage.getItem("theme");

  if (userPref === "dark") {
    document.body.classList.add("dark-mode");
  }

  toggleButton.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    localStorage.setItem("theme", isDark ? "dark" : "light");
  });

  // Highlight active TOC item on scroll
  document.addEventListener("scroll", function () {
    const sections = document.querySelectorAll("h2, h3");
    const scrollPosition = window.scrollY + 100;

    sections.forEach((section, index) => {
      const link = tocList.querySelectorAll("a")[index];
      if (section.offsetTop <= scrollPosition && section.offsetTop + section.offsetHeight > scrollPosition) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });
  });
});
