<h1 align='center'>Atode</h1>

<div align='center'>
  <img src="https://img.shields.io/badge/Version-v1.0-pink.svg" alt="Version">
  <img src="https://img.shields.io/badge/Nodejs-v22.17.1-lightgreen.svg" alt="NodeJS">
  <img src="https://img.shields.io/badge/MySQL-v8.3-blue.svg" alt="MySQL">
</div>

<p align='center'>一个多AI团队协作系统</p>

## 介绍

本项目的架构由5个AI构成：**计划AI** **思路AI** **专业AI** **审查AI** **整合AI** （基于Gemini）

用户的 Prompt 会首先发给计划AI用于分配任务以及指定任务类型，之后将通过链式传递给思路AI。思路AI负责规划任务的要求，细节。专业AI来处理与完成任务，不同的专业AI由不同的系统提示词来决定。审查AI会检查专业AI的生成内容是否符合用户要求，如果任务类型为代码，则会检验代码质量是否达标，并且将渲染出来的视觉图片交给Gemini进行二次的审美检测。整合AI将会把最终结果整理并输出给用户。

### 功能

* 暗黑模式
* 历史记录
* 账户系统
* 新建对话
* 停止对话

## 预览

![1753953137933.png](https://youke1.picui.cn/s1/2025/07/31/688b336403b3f.png)
![1753953127536.png](https://youke1.picui.cn/s1/2025/07/31/688b3363b715e.png)

## 部署

首先要创建一个`.env`文件，并写入以下内容：

```
GEMINI_API_KEY=your_gemini_api_key
GEMINI_BASE_URL=generativelanguage.googleapis.com
GEMINI_MODEL=gemini-2.5-pro

# MySQL 数据库配置
DB_HOST=your_host
DB_PORT=3306
DB_USER=your_db_username
DB_PASSWORD=your_db_psw
DB_NAME=your_db_name                                
```

然后使用 Docker 拉取项目

```
docker pull thirstywater/atode:latest
```

启动项目

```
docker run \
  -p 5002:5001 \
  --env-file /root/.env \
  thirstywater/atode
```




