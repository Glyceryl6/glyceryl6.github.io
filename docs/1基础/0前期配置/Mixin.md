# Mixin（未完成）
Mixin是一个强大且重要的工具，其主要用途是修改基本游戏中的已存在的代码，可以是通过注入自定义的逻辑、移除机制或者修改值。注意 Mixin 只能使用 Java 语言编写，即便你的项目使用 Kotlin 或者其他语言。\
\
虽然在Forge的外部库中已经引入了Mixin相关的库，但是我们仍需手动进行配置才能正常使用：
1. 创建一个新的包，用来存放Mixin类文件，建议包名直接命名为"mixin"；
2. 在resources目录下创建一个json文件，命名格式建议：mixins.xxx.json（xxx可以改成你的模组的英文简写），此处的"xxx"我改成了"gly"；
3. 打开该文件，向其中添加如下内容，然后把package改成你的mixin包所在的路径，refmap改成mixins.xxx.refmap.json：
```json
{
      "required": true,
      "minVersion": "0.8",
      "package": "com.glyceryl6.tutorial.mixin",
      "refmap": "mixins.gly.refmap.json",
      "compatibilityLevel": "JAVA_16",
      "mixins": [
      ],
      "client": [
      ],
      "injectors": {
        "defaultRequire": 1
      }
}
```
4. 