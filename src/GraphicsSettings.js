export function configureRendererQuality(renderer, composer, isMobile) {
  if (isMobile) {
    renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = false;
    // Disable heavy bloom passes on mobile for stable 60 FPS
  } else {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
  }
}