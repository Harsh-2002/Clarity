// Scroll reveal
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// Generate waveform bars
function generateWaveform(containerId, barCount = 40) {
    const container = document.getElementById(containerId);
    if (!container) return;
    for (let i = 0; i < barCount; i++) {
        const bar = document.createElement('div');
        bar.className = 'mock-wave-bar';
        const height = Math.random() * 24 + 4;
        bar.style.height = height + 'px';
        bar.style.animationDelay = (i * 0.05) + 's';
        container.appendChild(bar);
    }
}

function generateFeatureWaveform(containerId, barCount = 60) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:2px;height:56px;padding:12px 16px;background:var(--bg-warm);border:1px solid var(--border-light);border-radius:10px;';
    for (let i = 0; i < barCount; i++) {
        const bar = document.createElement('div');
        const height = Math.random() * 32 + 6;
        bar.style.cssText = `width:3px;height:${height}px;border-radius:2px;background:var(--accent);opacity:${0.3 + Math.random() * 0.5};flex-shrink:0;`;
        container.appendChild(bar);
    }
}

generateWaveform('hero-waveform', 30);
generateFeatureWaveform('feature-waveform', 60);

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// ==========================================
// USE CASES — Auto-scroll with engine effect
// ==========================================
(function initUsecasesScroll() {
    const track = document.querySelector('.usecases-track');
    const scrollContainer = document.querySelector('.usecases-scroll');
    if (!track || !scrollContainer) return;

    // Respect reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
        scrollContainer.style.overflowX = 'auto';
        scrollContainer.style.scrollbarWidth = 'none';
        track.style.padding = '0 24px';
        return;
    }

    // Clone all cards for seamless infinite loop
    const cards = track.querySelectorAll('.usecase-card');
    cards.forEach(card => {
        const clone = card.cloneNode(true);
        track.appendChild(clone);
    });

    // Measure the exact pixel offset to the first clone for a pixel-perfect reset.
    // This avoids any gap miscalculation that causes stutter at the seam.
    const allCards = track.querySelectorAll('.usecase-card');
    const resetPoint = allCards[cards.length].offsetLeft - allCards[0].offsetLeft;

    const CRUISE_SPEED = 1.2;  // px per frame at 60fps (~72px/s)
    const EASE_IN = 0.018;     // Acceleration (engine starting)
    const EASE_OUT = 0.035;    // Deceleration (engine stopping)

    let position = 0;
    let currentSpeed = 0;
    let targetSpeed = CRUISE_SPEED;

    scrollContainer.addEventListener('mouseenter', () => { targetSpeed = 0; });
    scrollContainer.addEventListener('mouseleave', () => { targetSpeed = CRUISE_SPEED; });
    scrollContainer.addEventListener('touchstart', () => { targetSpeed = 0; }, { passive: true });
    scrollContainer.addEventListener('touchend', () => { targetSpeed = CRUISE_SPEED; });

    function animate() {
        // Smooth easing — asymmetric for engine feel
        const ease = currentSpeed > targetSpeed ? EASE_OUT : EASE_IN;
        currentSpeed += (targetSpeed - currentSpeed) * ease;

        // Clean stop: snap to zero when close enough
        if (currentSpeed < 0.005 && targetSpeed === 0) {
            currentSpeed = 0;
        }

        position -= currentSpeed;

        // Seamless loop: wrap position when the first set has fully scrolled out
        if (position <= -resetPoint) {
            position += resetPoint;
        }

        // GPU-composited transform for jank-free rendering
        track.style.transform = `translate3d(${position}px, 0, 0)`;
        requestAnimationFrame(animate);
    }

    // Begin from standstill — ramps up smoothly
    currentSpeed = 0;
    animate();
})();
