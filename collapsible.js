// Initialize all collapsible buttons
document.querySelectorAll('.collapsible').forEach(button => {
  button.addEventListener('click', function() {
      this.classList.toggle('active');
      const content = this.nextElementSibling;
      
      if (content.style.maxHeight) {
          content.style.maxHeight = null;
      } else {
          content.style.maxHeight = content.scrollHeight + 'px';
      }
  });
});