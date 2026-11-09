# 引入JEI
JEI的功能就不多说了，配置JEI的步骤如下：
1. 打开build.gradle文件，然后向其中添加如下内容：
```
//在"repositories"块中添加如下内容：
repositories {

        maven {
            name 'progwm\'s Maven' // JEI
            url 'https://dvs1.progwml6.com/files/maven'
        }
        
}
//在"dependencies"块中添加如下内容：
dependencies {

        minecraft 'net.minecraftforge:forge:1.19.2-43.2.0'
    
        //需要你添加的内容：
        implementation fg.deobf("mezz.jei:jei-1.19.2-forge:11.2.0.254")
        
}
```
2. 然后刷新gradle，等待即可，成功之后可以在“外部库”中找到JEI相关的包：
![img.png](相关图片/外部JEI包.png)