import { ArrowRight, BarChart3, MessageSquare, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import './ChatAnalyticsHubPage.scss'

function ChatAnalyticsHubPage() {
  const navigate = useNavigate()

  return (
    <div className="chat-analytics-hub-page">
      <div className="chat-analytics-hub-content">
        <div className="chat-analytics-hub-badge">
          <BarChart3 size={16} />
          <span>聊天分析</span>
        </div>

        <h1>选择你要进入的分析视角</h1>
        <p className="chat-analytics-hub-desc">
          私聊分析更适合看好友聊天统计和趋势，群聊分析则用于查看群成员、发言排行和活跃时段。
        </p>

        <div className="chat-analytics-hub-grid">
          <button
            type="button"
            className="chat-analytics-entry-card"
            onClick={() => navigate('/analytics/private')}
          >
            <div className="entry-card-icon">
              <MessageSquare size={24} />
            </div>
            <div className="entry-card-header">
              <h2>私聊分析</h2>
              <ArrowRight size={18} />
            </div>
            <p>查看好友聊天统计、消息趋势、活跃时段与联系人排名。</p>
            <span className="entry-card-cta">进入私聊分析</span>
          </button>

          <button
            type="button"
            className="chat-analytics-entry-card"
            onClick={() => navigate('/analytics/group')}
          >
            <div className="entry-card-icon group">
              <Users size={24} />
            </div>
            <div className="entry-card-header">
              <h2>群聊分析</h2>
              <ArrowRight size={18} />
            </div>
            <p>查看群成员信息、发言排行、活跃时段和媒体内容统计。</p>
            <span className="entry-card-cta">进入群聊分析</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChatAnalyticsHubPage
