import { useNavigate } from 'react-router-dom'
import { BarChart2, History, RefreshCcw } from 'lucide-react'
import { useAnalyticsStore } from '../stores/analyticsStore'
import ChatAnalysisHeader from '../components/ChatAnalysisHeader'
import './AnalyticsWelcomePage.scss'

function AnalyticsWelcomePage() {
    const navigate = useNavigate()
    // 检查是否有任何缓存数据加载或基本的存储状态表明它已准备好。
    // 实际上，如果 store 没有持久化，`isLoaded` 可能会在应用刷新时重置。
    // 如果用户点击“加载缓存”但缓存为空，AnalyticsPage 的逻辑（loadData 不带 force）将尝试从后端缓存加载。
    // 如果后端缓存也为空，则会重新计算。

    // 我们也可以检查 `lastLoadTime` 来显示“上次更新：xxx”（如果已持久化）。
    const { lastLoadTime } = useAnalyticsStore()

    const handleLoadCache = () => {
        navigate('/analytics/private/view')
    }

    const handleNewAnalysis = () => {
        navigate('/analytics/private/view', { state: { forceRefresh: true } })
    }

    const formatLastTime = (ts: number | null) => {
        if (!ts) return '无记录'
        return new Date(ts).toLocaleString()
    }

    return (
        <div className="analytics-entry-page">
            <ChatAnalysisHeader currentMode="private" />

            <div className="analytics-welcome-container analytics-welcome-container--mode">
                <div className="welcome-content">
                    <div className="icon-wrapper">
                        <BarChart2 size={40} />
                    </div>
                    <h1>私聊数据分析</h1>
                    <p>
                        WeFlow 可以分析你的好友聊天记录，生成详细的统计报表。<br />
                        你可以选择加载上次的分析结果，或者重新开始一次新的私聊分析。
                    </p>

                    <div className="action-cards">
                        <button onClick={handleLoadCache}>
                            <div className="card-icon">
                                <History size={24} />
                            </div>
                            <h3>加载缓存</h3>
                            <span>查看上次分析结果<br />(上次更新: {formatLastTime(lastLoadTime)})</span>
                        </button>

                        <button onClick={handleNewAnalysis}>
                            <div className="card-icon">
                                <RefreshCcw size={24} />
                            </div>
                            <h3>新的分析</h3>
                            <span>重新扫描并计算数据<br />(可能需要几分钟)</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AnalyticsWelcomePage
