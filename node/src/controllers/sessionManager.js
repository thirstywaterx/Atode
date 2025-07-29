const crypto = require('crypto');

const sessions = new Map();
const SESSION_LIFETIME = 1000 * 60 * 60 * 24; // 24 hours

function createSession(user, rememberMe) {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const expires = rememberMe ? Date.now() + SESSION_LIFETIME * 30 : Date.now() + SESSION_LIFETIME; // Remember for 30 days or 1 day
    
    sessions.set(sessionId, {
        userId: user.id,
        username: user.username,
        expires: expires
    });
    
    console.log(`✅ 创建新会话: ${sessionId} for user ${user.username}`);
    return { sessionId, expires };
}

function getSession(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) {
        return null;
    }
    if (session.expires < Date.now()) {
        sessions.delete(sessionId);
        console.log(`🗑️ 会话已过期并删除: ${sessionId}`);
        return null;
    }
    return session;
}

function deleteSession(sessionId) {
    console.log(`🗑️ 删除会话: ${sessionId}`);
    sessions.delete(sessionId);
}

// 定期清理过期会话
setInterval(() => {
    const now = Date.now();
    for (const [sessionId, session] of sessions.entries()) {
        if (session.expires < now) {
            sessions.delete(sessionId);
            console.log(`🧹 定期清理过期会话: ${sessionId}`);
        }
    }
}, 1000 * 60 * 60); // 每小时清理一次

module.exports = {
    createSession,
    getSession,
    deleteSession
};
