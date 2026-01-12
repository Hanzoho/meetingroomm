// Preload รูปภาพสำคัญเพื่อป้องกันการกระตุก
export const preloadImages = () => {
  if (typeof window !== 'undefined') {
    const imageUrls = [
      '/images/room1.jpg',
      '/images/room2.jpg',
      '/images/room3.jpg',
      '/images/room4.jpg',
      '/images/room5.jpg',
      '/images/room6.jpg',
    ]

    imageUrls.forEach(url => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'image'
      link.href = url
      document.head.appendChild(link)
    })
  }
}

// Lazy loading utility
export const createImageLoader = () => {
  if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target
          img.src = img.dataset.src
          img.classList.remove('lazy')
          observer.unobserve(img)
        }
      })
    })

    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img)
    })
  }
}

// Performance monitoring
export const measurePagePerformance = () => {
  if (typeof window !== 'undefined' && 'performance' in window) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const perfData = performance.getEntriesByType('navigation')[0]
        console.log('Page Load Time:', perfData.loadEventEnd - perfData.loadEventStart, 'ms')
      }, 0)
    })
  }
}
