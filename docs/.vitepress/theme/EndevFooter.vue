<template>
  <footer class="EndevFooter">
    <span>MIT 许可证</span>
    <span aria-hidden="true">·</span>
    <span>版权所有 © {{ year }}</span>
    <span aria-hidden="true">·</span>
    <a class="EndevFooterLink" href="https://jdx.dev">
      <!-- <img
        alt=""
        class="EndevFooterLogo"
        height="28"
        src="https://github.com/jdx.png?size=96"
        width="28"
      /> -->
      <span>jdx.dev</span>
    </a>
    <span aria-hidden="true">·</span>
    <a class="EndevFooterLink" target="_blank" href="https://www.zhcndoc.com">简中文档</a>
    <span aria-hidden="true">·</span>
    <a
      class="EndevFooterLink"
      target="_blank"
      href="https://beian.miit.gov.cn"
      rel="nofollow"
      >沪ICP备2024070610号-3</a
    >
  </footer>
</template>

<script setup lang="ts">
const year = new Date().getFullYear();
</script>
