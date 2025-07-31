FROM node:22.17.1

WORKDIR /app

# 安装 MySQL
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y mysql-server && \
    rm -rf /var/lib/apt/lists/*

# 复制项目文件
COPY . .

# 安装依赖
RUN npm install

# 初始化 MySQL，创建 atode 用户和数据库
RUN service mysql start && \
    sleep 5 && \
    mysql -u root -e "CREATE USER IF NOT EXISTS 'atode'@'%' IDENTIFIED BY 'atode';" && \
    mysql -u root -e "CREATE DATABASE IF NOT EXISTS atode;" && \
    mysql -u root -e "GRANT ALL PRIVILEGES ON atode.* TO 'atode'@'%'; FLUSH PRIVILEGES;"

EXPOSE 5001 3306

# 启动脚本：先启动MySQL，再启动Node
CMD service mysql start && npm start
