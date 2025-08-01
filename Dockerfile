FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install

# 复制项目文件
COPY . .

# 使用阿里云源
RUN echo "deb https://mirrors.aliyun.com/debian/ bookworm main contrib non-free non-free-firmware\n\
deb https://mirrors.aliyun.com/debian/ bookworm-updates main contrib non-free non-free-firmware\n\
deb https://mirrors.aliyun.com/debian-security bookworm-security main contrib non-free non-free-firmware" > /etc/apt/sources.list \
    && apt-get update \
    && apt-get install -y \
        libnspr4 \
        libnss3 \
        libatk-bridge2.0-0 \
        libatk1.0-0 \
        libgtk-3-0 \
        libx11-xcb1 \
        libxcomposite1 \
        libxdamage1 \
        libxrandr2 \
        libgbm1 \
        libasound2 \
        libpangocairo-1.0-0 \
        libpango-1.0-0 \
        libcups2 \
        libdrm2 \
        libxfixes3 \
        libxext6 \
        libxi6 \
        libxtst6 \
        libnss3 \
        libnss3-tools \
        fonts-liberation \
        libappindicator3-1 \
        libatspi2.0-0 \
        libwayland-client0 \
        libwayland-cursor0 \
        libwayland-egl1 \
        libxkbcommon0 \
        libxss1 \
        lsb-release \
        xdg-utils \
        wget \
        ca-certificates \
        --no-install-recommends \
    || apt-get install -y --fix-missing \
    && ldconfig

EXPOSE 5001

# 启动脚本
CMD ["npm", "run", "dev"]
