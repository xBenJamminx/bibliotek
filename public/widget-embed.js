(function () {
  function load() {
    if (window.__CHAT_WIDGET_LOADED__) return
    window.__CHAT_WIDGET_LOADED__ = true

    var origin = document.currentScript && document.currentScript.dataset && document.currentScript.dataset.origin
    if (!origin) {
      origin = window.__CHAT_WIDGET_ORIGIN__ || window.location.origin
    }

    var assistantId = window.__CHAT_ASSISTANT_ID__ || (document.currentScript && document.currentScript.dataset.assistantId)
    var primaryColor = window.__CHAT_PRIMARY_COLOR__ || (document.currentScript && document.currentScript.dataset.primaryColor)
    var title = window.__CHAT_TITLE__ || (document.currentScript && document.currentScript.dataset.title)
    var subtitle = window.__CHAT_SUBTITLE__ || (document.currentScript && document.currentScript.dataset.subtitle)
    var brand = window.__CHAT_BRAND__ || (document.currentScript && document.currentScript.dataset.brand)

    var url = origin + "/en/widget?"
    if (assistantId) url += "assistantId=" + encodeURIComponent(assistantId) + "&"
    if (primaryColor) url += "primaryColor=" + encodeURIComponent(primaryColor) + "&"
    if (title) url += "title=" + encodeURIComponent(title) + "&"
    if (subtitle) url += "subtitle=" + encodeURIComponent(subtitle) + "&"
    if (brand) url += "brand=" + encodeURIComponent(brand) + "&"

    var iframe = document.createElement("iframe")
    iframe.src = url
    iframe.style.position = "fixed"
    iframe.style.bottom = "0"
    iframe.style.right = "0"
    iframe.style.width = "0"
    iframe.style.height = "0"
    iframe.style.border = "0"
    iframe.style.zIndex = "2147483647"
    iframe.allow = "clipboard-write;"

    document.body.appendChild(iframe)

    // Listen for resize messages from iframe
    window.addEventListener("message", function (e) {
      if (!e || !e.data) return
      if (e.data.type === "widget-resize") {
        iframe.style.width = (e.data.width || 0) + "px"
        iframe.style.height = (e.data.height || 0) + "px"
      }
    })

    // Expose minimal API
    window.ChatWidget = {
      open: function () {
        iframe.contentWindow.postMessage({ type: "widget-open" }, "*")
      },
      close: function () {
        iframe.contentWindow.postMessage({ type: "widget-close" }, "*")
      }
    }
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(load, 0)
  } else {
    document.addEventListener("DOMContentLoaded", load)
  }
})()


