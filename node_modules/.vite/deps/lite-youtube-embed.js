// node_modules/.pnpm/lite-youtube-embed@0.3.3/node_modules/lite-youtube-embed/src/lite-yt-embed.js
var LiteYTEmbed = class _LiteYTEmbed extends HTMLElement {
  connectedCallback() {
    this.videoId = this.getAttribute("videoid");
    let playBtnEl = this.querySelector(".lty-playbtn");
    this.playLabel = playBtnEl && playBtnEl.textContent.trim() || this.getAttribute("playlabel") || "Play";
    this.dataset.title = this.getAttribute("title") || "";
    if (!this.style.backgroundImage) {
      this.style.backgroundImage = `url("https://i.ytimg.com/vi/${this.videoId}/hqdefault.jpg")`;
      this.upgradePosterImage();
    }
    if (!playBtnEl) {
      playBtnEl = document.createElement("button");
      playBtnEl.type = "button";
      playBtnEl.classList.add("lty-playbtn");
      this.append(playBtnEl);
    }
    if (!playBtnEl.textContent) {
      const playBtnLabelEl = document.createElement("span");
      playBtnLabelEl.className = "lyt-visually-hidden";
      playBtnLabelEl.textContent = this.playLabel;
      playBtnEl.append(playBtnLabelEl);
    }
    this.addNoscriptIframe();
    if (playBtnEl.nodeName === "A") {
      playBtnEl.removeAttribute("href");
      playBtnEl.setAttribute("tabindex", "0");
      playBtnEl.setAttribute("role", "button");
      playBtnEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.activate();
        }
      });
    }
    this.addEventListener("pointerover", _LiteYTEmbed.warmConnections, { once: true });
    this.addEventListener("focusin", _LiteYTEmbed.warmConnections, { once: true });
    this.addEventListener("click", this.activate);
    this.needsYTApi = this.hasAttribute("js-api") || navigator.vendor.includes("Apple") || navigator.userAgent.includes("Mobi");
  }
  /**
   * Add a <link rel={preload | preconnect} ...> to the head
   */
  static addPrefetch(kind, url, as) {
    const linkEl = document.createElement("link");
    linkEl.rel = kind;
    linkEl.href = url;
    if (as) {
      linkEl.as = as;
    }
    document.head.append(linkEl);
  }
  /**
   * Begin pre-connecting to warm up the iframe load
   * Since the embed's network requests load within its iframe,
   *   preload/prefetch'ing them outside the iframe will only cause double-downloads.
   * So, the best we can do is warm up a few connections to origins that are in the critical path.
   *
   * Maybe `<link rel=preload as=document>` would work, but it's unsupported: http://crbug.com/593267
   * But TBH, I don't think it'll happen soon with Site Isolation and split caches adding serious complexity.
   */
  static warmConnections() {
    if (_LiteYTEmbed.preconnected) return;
    _LiteYTEmbed.addPrefetch("preconnect", "https://www.youtube-nocookie.com");
    _LiteYTEmbed.addPrefetch("preconnect", "https://www.google.com");
    _LiteYTEmbed.addPrefetch("preconnect", "https://googleads.g.doubleclick.net");
    _LiteYTEmbed.addPrefetch("preconnect", "https://static.doubleclick.net");
    _LiteYTEmbed.preconnected = true;
  }
  fetchYTPlayerApi() {
    if (window.YT || window.YT && window.YT.Player) return;
    this.ytApiPromise = new Promise((res, rej) => {
      var el = document.createElement("script");
      el.src = "https://www.youtube.com/iframe_api";
      el.async = true;
      el.onload = (_) => {
        YT.ready(res);
      };
      el.onerror = rej;
      this.append(el);
    });
  }
  /** Return the YT Player API instance. (Public L-YT-E API) */
  async getYTPlayer() {
    if (!this.playerPromise) {
      await this.activate();
    }
    return this.playerPromise;
  }
  async addYTPlayerIframe() {
    this.fetchYTPlayerApi();
    await this.ytApiPromise;
    const videoPlaceholderEl = document.createElement("div");
    this.append(videoPlaceholderEl);
    const paramsObj = Object.fromEntries(this.getParams().entries());
    this.playerPromise = new Promise((resolve) => {
      let player = new YT.Player(videoPlaceholderEl, {
        width: "100%",
        videoId: this.videoId,
        playerVars: paramsObj,
        events: {
          "onReady": (event) => {
            event.target.playVideo();
            resolve(player);
          }
        }
      });
    });
  }
  // Add the iframe within <noscript> for indexability discoverability. See https://github.com/paulirish/lite-youtube-embed/issues/105
  addNoscriptIframe() {
    const iframeEl = this.createBasicIframe();
    const noscriptEl = document.createElement("noscript");
    noscriptEl.innerHTML = iframeEl.outerHTML;
    this.append(noscriptEl);
  }
  getParams() {
    const params = new URLSearchParams(this.getAttribute("params") || []);
    params.append("autoplay", "1");
    params.append("playsinline", "1");
    return params;
  }
  async activate() {
    if (this.classList.contains("lyt-activated")) return;
    this.classList.add("lyt-activated");
    if (this.needsYTApi) {
      return this.addYTPlayerIframe(this.getParams());
    }
    const iframeEl = this.createBasicIframe();
    this.append(iframeEl);
    iframeEl.focus();
  }
  createBasicIframe() {
    const iframeEl = document.createElement("iframe");
    iframeEl.width = 560;
    iframeEl.height = 315;
    iframeEl.title = this.playLabel;
    iframeEl.allow = "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture";
    iframeEl.allowFullscreen = true;
    iframeEl.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(this.videoId)}?${this.getParams().toString()}`;
    return iframeEl;
  }
  /**
   * In the spirit of the `lowsrc` attribute and progressive JPEGs, we'll upgrade the reliable
   * poster image to a higher resolution one, if it's available.
   * Interestingly this sddefault webp is often smaller in filesize, but we will still attempt it second
   * because getting _an_ image in front of the user if our first priority.
   *
   * See https://github.com/paulirish/lite-youtube-embed/blob/master/youtube-thumbnail-urls.md for more details
   */
  upgradePosterImage() {
    setTimeout(() => {
      const webpUrl = `https://i.ytimg.com/vi_webp/${this.videoId}/sddefault.webp`;
      const img = new Image();
      img.fetchPriority = "low";
      img.referrerpolicy = "origin";
      img.src = webpUrl;
      img.onload = (e) => {
        const noAvailablePoster = e.target.naturalHeight == 90 && e.target.naturalWidth == 120;
        if (noAvailablePoster) return;
        this.style.backgroundImage = `url("${webpUrl}")`;
      };
    }, 100);
  }
};
customElements.define("lite-youtube", LiteYTEmbed);
//# sourceMappingURL=lite-youtube-embed.js.map
