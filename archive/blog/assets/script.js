document.addEventListener('DOMContentLoaded', () => {
  async function loadJSON() {
    const res = await fetch('docs.json');
    const data = await res.json();
    const categoryList = document.getElementById('categoryList');

    data.forEach(category => {
      const details = document.createElement('details');
      details.classList.add('category');

      const summary = document.createElement('summary');
      summary.textContent = category.category;
      details.appendChild(summary);

      const ul = document.createElement('ul');

      category.posts.forEach(post => {
        const li = document.createElement('li');
        li.textContent = post.title;
        li.onclick = () => loadMarkdown(post.file);
        ul.appendChild(li);
      });

      details.appendChild(ul);
      categoryList.appendChild(details);
    });

    // Auto-expand first category
    const first = document.querySelector('.category');
    if (first) first.setAttribute('open', true);
  }

  async function loadMarkdown(filePath) {
    const res = await fetch(filePath);
    const mdText = await res.text();
    const html = marked.parse(mdText);
    const contentDiv = document.getElementById('postContent');
    contentDiv.innerHTML = html;

    generateTOC();
  }

  function generateTOC() {
    const headings = document.querySelectorAll('#postContent h2, #postContent h3');
    const tocList = document.getElementById('tocList');
    tocList.innerHTML = '';

    headings.forEach((heading, index) => {
      const id = `heading-${index}`;
      heading.id = id;

      const li = document.createElement('li');
      li.textContent = heading.textContent;
      li.style.marginLeft = heading.tagName === 'H3' ? '1rem' : '0';

      li.onclick = () => {
        document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
      };

      tocList.appendChild(li);
    });
  }

  loadJSON();

  document.getElementById('toggleSidebar').addEventListener('click', () => {
    const list = document.getElementById('categoryList');
    list.classList.toggle('show');
  });
});