const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const _ = db.command

exports.main = async (context) => {
  const { _id, list, _openid, checkinUserNickname } = context
  
  try {
    const res = await db.collection(list).doc(_id).get()
    const mission = res.data
    
    // 移除对isLongTerm的限制，允许普通任务也使用审核机制
    
    if (mission._openid === _openid) {
      return { success: false, message: '不能打卡自己的任务' }
    }
    
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    
    if (mission.isLongTerm) {
      // 长期任务处理
      // 确保dailyRecords是数组
      const safeDailyRecords = Array.isArray(mission.dailyRecords) ? mission.dailyRecords : [];
      
      // 检查今天是否已经有打卡记录（任何状态）
      const existingRecord = safeDailyRecords.find(record => record.date === todayStr);
      if (existingRecord) {
        if (existingRecord.status === 'approved') {
          return { success: false, message: '今日已完成打卡' }
        } else if (existingRecord.status === 'pending') {
          return { success: false, message: '打卡申请已提交，等待审核' }
        } else if (existingRecord.status === 'rejected') {
          // 如果是已驳回状态，删除旧记录，允许重新提交
          const updatedRecords = safeDailyRecords.filter(record => record.date !== todayStr);
          await db.collection(list).doc(_id).update({
            data: {
              dailyRecords: updatedRecords
            }
          });
        }
      }
      
      if (mission.completedDays >= mission.totalDays) {
        return { success: false, message: '任务已完成' }
      }
      
      // 创建待审核的打卡记录 - 确保初始状态正确
      const newRecord = {
        date: todayStr,
        completed: false, // 必须为false，等待审核通过后才改为true
        status: 'pending', // 必须为pending，等待审核
        checkinUserId: _openid, // 打卡用户ID
        createTime: db.serverDate() // 创建时间
      };
      
      await db.collection(list).doc(_id).update({
        data: {
          dailyRecords: _.push(newRecord)
        }
      });
    } else {
      // 普通任务处理
      // 确保checkinRecords是数组
      const checkinRecords = Array.isArray(mission.checkinRecords) ? mission.checkinRecords : [];
      
      // 检查是否已经有提交记录（任何状态）
      if (checkinRecords.length > 0) {
        const latestRecord = checkinRecords[checkinRecords.length - 1];
        if (latestRecord.status === 'approved') {
          return { success: false, message: '任务已完成' }
        } else if (latestRecord.status === 'pending') {
          return { success: false, message: '完成申请已提交，等待审核' }
        } else if (latestRecord.status === 'rejected') {
          // 如果是已驳回状态，删除旧记录，允许重新提交
          await db.collection(list).doc(_id).update({
            data: {
              checkinRecords: []
            }
          });
        }
      }
      
      // 检查任务是否已完成
      if (!mission.available) {
        return { success: false, message: '任务已完成' }
      }
      
      // 创建待审核的完成申请记录
      const newRecord = {
        date: todayStr,
        completed: false, // 必须为false，等待审核通过后才改为true
        status: 'pending', // 必须为pending，等待审核
        checkinUserId: _openid, // 完成任务的用户ID
        createTime: db.serverDate() // 创建时间
      };
      
      await db.collection(list).doc(_id).update({
        data: {
          checkinRecords: _.push(newRecord)
        }
      });
    }
    
    // 发送订阅消息给任务创建者
    try {
      console.log('准备发送打卡申请通知，任务创建者openid:', mission._openid);
      
      // 使用前端传递的真实用户名，避免写死映射
      const checkinNickname = checkinUserNickname || '用户';
      console.log('打卡用户openid:', _openid, '，显示名称:', checkinNickname);
      
      // 格式化时间为正确的格式（东八区时间）
      const currentTime = new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'Asia/Shanghai'
      });
      
      // 调用 information 云函数发送通知，保持代码一致性
      const sendResult = await cloud.callFunction({
        name: 'information',
        data: {
          templateId: '0ladc37q-fQoOMeGh7q2p-nPSAmrPyq2pT_3-roPCV0',
          taskName: `${mission.title || '任务'} - 打卡申请`,
          publishTime: currentTime,
          rewardPoints: mission.credit || 0,
          initiator: checkinNickname,
          _openid: mission._openid,
          _id: _id
        }
      });
      console.log('打卡申请通知发送成功结果:', sendResult);
    } catch (sendError) {
      console.error('发送打卡通知失败详细信息:', sendError);
      // 发送失败不影响主流程，继续返回成功
    }
    
    // 确保返回的状态正确
    return {
      success: true,
      message: '打卡申请已提交，等待审核',
      isCompleted: false,
      newCompletedDays: mission.completedDays // 保持原有天数，审核通过后才增加
    };
  } catch (error) {
    console.error('打卡申请失败:', error);
    return { success: false, message: error.message };
  }
}
