import React from 'react'
import { Bot, User } from 'lucide-react'

interface ChatMessage {
    id: string;
    role: 'user' | 'ai';
    content: string;
    timestamp: number;
}

interface MessageBubbleProps {
    message: ChatMessage;
}

/**
 * 优化后的消息气泡组件
 * 使用 React.memo 避免不必要的重新渲染
 */
export const MessageBubble = React.memo<MessageBubbleProps>(({ message }) => {
    return (
        <div className={`message-row ${message.role}`}>
            <div className="avatar">
                {message.role === 'ai' ? <Bot size={24} /> : <User size={24} />}
            </div>
            <div className="bubble">
                <div className="content">{message.content}</div>
            </div>
        </div>
    )
}, (prevProps, nextProps) => {
    // 自定义比较函数：只有内容或ID变化时才重新渲染
    return prevProps.message.content === nextProps.message.content &&
        prevProps.message.id === nextProps.message.id
})

MessageBubble.displayName = 'MessageBubble'
