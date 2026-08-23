// Effet simple : navbar qui se compacte au scroll
const navbar = document.querySelector(".navbar");

window.addEventListener("scroll", () => {
  if (window.scrollY > 40) {
    navbar.style.padding = "8px 5%";
  } else {
    navbar.style.padding = "14px 5%";
  }
});

// Smooth scroll déjà géré par CSS (scroll-behavior: smooth)
console.log("PBUFC — PlayBoy Underground Fight Club 🥊");
