# 设置

<script setup>
import Settings from '/components/settings.vue';
</script>

以下是 mise 的所有设置列表。这些设置可以通过 `mise settings key=value` 来设置，
也可以通过直接修改 [全局配置文件](/configuration.html#mise_global_config_file)
（`~/.config/mise/config.toml`）或本地配置，或者通过环境变量来设置。

其中一些也可以通过全局 CLI 标志来设置。

<Settings :level="2" />
