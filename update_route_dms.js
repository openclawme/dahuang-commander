import fs from 'fs';

const filePath = '/home/admin/Gemini/agent-forum/src/app/api/agent/command/route.ts';
let code = fs.readFileSync(filePath, 'utf8');

// 1. Replace the LLM prompt block to add Direct Message rules
const oldPromptBlock = `请针对该指令进行心流思考。如果你需要执行动作（如发帖、评论等），请在 JSON 中指明。为了防止响应被截断并提高速度，请遵循以下严苛规则：
1. 你的 "reply" 和 "logs" 的信息必须极其简短、干练，字数越少越好，突出重点即可！
2. 如果不需要【发表新帖】（shouldPost: false），请在返回的 JSON 中【完全省去】"postTitle"、"postContent" 和 "subforumId" 这三个字段！
3. 如果不需要【发表评论】（shouldComment: false），请在返回的 JSON 中【完全省去】"postId" 和 "commentContent" 字段！

返回一个合法的、紧凑的 JSON，不要带有 \\\`\\\`\\\`json 标记或任何包裹，确保其可以被 JSON.parse 解析：
{
  "logs": [
    { "type": "SYSTEM", "message": "收到指令：..." },
    { "type": "THOUGHT", "message": "简短思考..." },
    { "type": "ACTION", "message": "执行或模拟动作..." }
  ],
  "reply": "精炼的神谕回复（100字以内）",
  "shouldPost": true/false,
  "postTitle": "拟定的标题(仅当shouldPost为true时提供)",
  "postContent": "拟定的正文(仅当shouldPost为true时提供)",
  "subforumId": "版块ID(仅当shouldPost为true时提供)",
  "shouldComment": true/false,
  "postId": "帖子ID(仅当shouldComment为true时提供)",
  "commentContent": "评论内容(仅当shouldComment为true时提供)"
}`;

// Note: we can use simple regex or string splits to be robust in case template literals got escaped.
// Let's check if we can do an easier, more direct string replacement.
const oldPromptMarker = `3. 如果不需要【发表评论】（shouldComment: false），请在返回的 JSON 中【完全省去】"postId" 和 "commentContent" 字段！`;

const newPromptMarker = `3. 如果不需要【发表评论】（shouldComment: false），请在返回的 JSON 中【完全省去】"postId" 和 "commentContent" 字段！
4. 如果不需要【发送私信】（shouldDirectMessage: false），请在返回的 JSON 中【完全省去】"receiverName" 和 "directMessageContent" 字段！`;

const oldSchemaMarker = `  "shouldComment": true/false,
  "postId": "帖子ID(仅当shouldComment为true时提供)",
  "commentContent": "评论内容(仅当shouldComment为true时提供)"`;

const newSchemaMarker = `  "shouldComment": true/false,
  "postId": "帖子ID(仅当shouldComment为true时提供)",
  "commentContent": "评论内容(仅当shouldComment为true时提供)",
  "shouldDirectMessage": true/false,
  "receiverName": "接收者智能体名号(仅当shouldDirectMessage为true时提供，如'海马·青龙'，请注意名字中的中英文符号需要精确匹配)",
  "directMessageContent": "私信内容(仅当shouldDirectMessage为true时提供)"`;

if (code.includes(oldPromptMarker)) {
  code = code.replace(oldPromptMarker, newPromptMarker);
  console.log("Successfully updated prompt instructions!");
} else {
  console.error("Could not find oldPromptMarker!");
}

if (code.includes(oldSchemaMarker)) {
  code = code.replace(oldSchemaMarker, newSchemaMarker);
  console.log("Successfully updated JSON schema definition!");
} else {
  console.error("Could not find oldSchemaMarker!");
}

// 2. Replace the fallback decision block
const oldFallbackBlock = `                    decision = {
                        logs,
                        reply: extractedReply || "（本尊赎罪，天道在凝聚决策神念时突发法力阻滞，未能在天书中完成书写，请再次赐予指令）",
                        shouldPost: false,
                        shouldComment: false
                    };`;

const newFallbackBlock = `                    decision = {
                        logs,
                        reply: extractedReply || "（本尊赎罪，天道在凝聚决策神念时突发法力阻滞，未能在天书中完成书写，请再次赐予指令）",
                        shouldPost: false,
                        shouldComment: false,
                        shouldDirectMessage: false
                    };`;

if (code.includes(oldFallbackBlock)) {
  code = code.replace(oldFallbackBlock, newFallbackBlock);
  console.log("Successfully replaced fallback block!");
} else {
  console.error("Could not find oldFallbackBlock!");
}

// 3. Replace the actual database action logic
const oldActionBlock = `            if (decision.shouldComment && decision.postId && decision.commentContent) {
                const comment = await prisma.comment.create({
                    data: {
                        content: decision.commentContent,
                        postId: decision.postId,
                        authorType: "AGENT",
                        agentId: agent.id
                    },
                    include: { agent: true, post: true }
                });
                getIO().emit('new_comment', comment);
                performedActions.push(\`COMMENTED_ON_POST: \${decision.postId}\`);
            }`;

const newActionBlock = `            if (decision.shouldComment && decision.postId && decision.commentContent) {
                const comment = await prisma.comment.create({
                    data: {
                        content: decision.commentContent,
                        postId: decision.postId,
                        authorType: "AGENT",
                        agentId: agent.id
                    },
                    include: { agent: true, post: true }
                });
                getIO().emit('new_comment', comment);
                performedActions.push(\`COMMENTED_ON_POST: \${decision.postId}\`);
            }

            if (decision.shouldDirectMessage && decision.receiverName && decision.directMessageContent) {
                // Robust Direct Message (Private Message) implementation
                // Try unique exact name match first
                let receiver = await prisma.agent.findUnique({
                    where: { name: decision.receiverName }
                });

                if (!receiver) {
                    // Fallback to robust fuzzy/contains matching for maximum UX comfort!
                    receiver = await prisma.agent.findFirst({
                        where: {
                            OR: [
                                { name: { contains: decision.receiverName } },
                                { displayName: { contains: decision.receiverName } }
                            ]
                        }
                    });
                }

                if (receiver) {
                    if (receiver.id !== agent.id) {
                        const dm = await prisma.directMessage.create({
                            data: {
                                senderId: agent.id,
                                receiverId: receiver.id,
                                content: decision.directMessageContent
                            }
                        });
                        
                        // Push via Socket.io
                        try {
                            getIO().emit('new_direct_message', {
                                id: dm.id,
                                senderId: agent.id,
                                receiverId: receiver.id,
                                content: decision.directMessageContent,
                                createdAt: dm.createdAt
                            });
                        } catch (ioErr) {
                            console.warn("Socket.io emit for DM failed:", ioErr);
                        }
                        
                        performedActions.push(\`SENT_DIRECT_MESSAGE_TO: \${receiver.name}\`);
                    } else {
                        performedActions.push(\`FAILED_DIRECT_MESSAGE: Cannot send private message to yourself.\`);
                    }
                } else {
                    performedActions.push(\`FAILED_DIRECT_MESSAGE: Agent '\${decision.receiverName}' not found.\`);
                }
            }`;

if (code.includes(oldActionBlock)) {
  code = code.replace(oldActionBlock, newActionBlock);
  console.log("Successfully replaced action block!");
} else {
  console.error("Could not find oldActionBlock!");
}

fs.writeFileSync(filePath, code, 'utf8');
console.log("Write completed successfully!");
