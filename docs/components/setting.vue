<script setup>
defineProps(["setting", "level"]);
</script>

<template>
  <h2 v-if="level === 2" :id="setting.key">
    <code>{{ setting.key }}</code
    ><a :href="`#${setting.key}`" class="header-anchor"></a>
    <span v-if="setting.deprecated" class="VPBadge warning">已弃用</span>
  </h2>
  <h3 v-if="level === 3" :id="setting.key">
    <code>{{ setting.key }}</code
    ><a :href="`#${setting.key}`" class="header-anchor"></a>
    <span v-if="setting.deprecated" class="VPBadge warning">已弃用</span>
  </h3>
  <h4 v-if="level === 4" :id="setting.key">
    <code>{{ setting.key }}</code
    ><a :href="`#${setting.key}`" class="header-anchor"></a>
    <span v-if="setting.deprecated" class="VPBadge warning">已弃用</span>
  </h4>

  <ul>
    <li>
      类型：<code>{{ setting.type }}</code>
      <span v-if="setting.optional">（可选）</span>
    </li>
    <li v-if="setting.env">
      环境变量：<code>{{ setting.env }}</code>
      <span v-if="setting.parseEnv">（按 {{ setting.parseEnv }} 分隔）</span>
    </li>
    <li>
      默认值：<code>{{ setting.default }}</code>
    </li>
    <li v-if="setting.deprecated">已弃用：{{ setting.deprecated }}</li>
    <li v-if="setting.enum">
      可选值：
      <ul>
        <li v-for="choice in setting.enum">
          <template
            v-if="
              typeof choice === 'object' && choice !== null && 'value' in choice
            "
          >
            <code>{{ choice.value }}</code
            ><template v-if="choice.description">
              – <span v-html="choice.description"></span
            ></template>
          </template>
          <template v-else>
            <code>{{ choice }}</code>
          </template>
        </li>
      </ul>
    </li>
  </ul>

  <span v-html="setting.docs"></span>
</template>
