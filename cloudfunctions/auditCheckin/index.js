const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const _ = db.command

exports.main = async (context) => {
  const { _id, list, recordIndex, action } = context
  
  console.log('审核请求参数:', context);
  
  try {
    // 获取任务信息
    const res = await db.collection(list).doc(_id).get()
    const mission = res.data
    
    console.log('任务信息:', mission);
    
    // 移除对isLongTerm的限制，允许普通任务也使用审核机制
    
    // 根据任务类型选择不同的记录字段
    let records;
    let recordField;
    
    if (mission.isLongTerm) {
      // 长期任务
      records = Array.isArray(mission.dailyRecords) ? mission.dailyRecords : [];
      recordField = 'dailyRecords';
    } else {
      // 普通任务
      records = Array.isArray(mission.checkinRecords) ? mission.checkinRecords : [];
      recordField = 'checkinRecords';
    }
    
    console.log('打卡记录列表:', records);
    
    if (recordIndex < 0 || recordIndex >= records.length) {
      console.error('无效的打卡记录索引:', recordIndex, '，总记录数:', records.length);
      return { success: false, message: '无效的打卡记录索引' }
    }
    
    const record = records[recordIndex];
    console.log('当前审核记录:', record);
    
    if (record.status !== 'pending') {
      console.error('该打卡记录已处理，当前状态:', record.status);
      return { success: false, message: '该打卡记录已处理' }
    }
    
    if (action === 'approve') {
      // 审核通过
      console.log('执行审核通过操作');
      
      // 1. 更新打卡记录状态
      records[recordIndex] = {
        ...record,
        status: 'approved',
        completed: true,
        auditTime: db.serverDate()
      };
      
      let completedDays = 0;
      let isCompleted = false;
      let creditToAdd = 0;
      
      if (mission.isLongTerm) {
        // 长期任务处理
        // 2. 计算已完成天数 - 只计算已通过的记录
        completedDays = records.filter(r => r.status === 'approved' && r.completed).length;
        console.log('计算已完成天数:', completedDays);
        
        // 3. 更新任务数据
        await db.collection(list).doc(_id).update({
          data: {
            [recordField]: records,
            completedDays: completedDays
          }
        });
        console.log('任务数据已更新');
        
        // 4. 计算每日积分
        creditToAdd = mission.dailyCredit || Math.floor(mission.credit / mission.totalDays);
        console.log('计算每日积分:', creditToAdd, '，总积分:', mission.credit, '，总天数:', mission.totalDays);
        
        // 5. 检查任务是否完成
        isCompleted = completedDays >= mission.totalDays;
        console.log('检查任务是否完成:', isCompleted, '，已完成天数:', completedDays, '，总天数:', mission.totalDays);
      } else {
        // 普通任务处理
        // 2. 更新任务数据 - 直接标记为完成
        await db.collection(list).doc(_id).update({
          data: {
            [recordField]: records,
            available: false // 普通任务审核通过后直接标记为完成
          }
        });
        console.log('任务数据已更新');
        
        // 3. 普通任务直接发放总积分
        creditToAdd = mission.credit;
        console.log('计算积分:', creditToAdd, '，总积分:', mission.credit);
        
        // 4. 普通任务审核通过后直接完成
        isCompleted = true;
      }
      
      // 发放积分
      await db.collection('UserList').where({
        _openid: record.checkinUserId
      }).update({
        data: {
          credit: _.inc(creditToAdd)
        }
      });
      console.log('积分已发放给用户:', record.checkinUserId);
      
      // 6. 如果是长期任务且已完成，标记任务为不可用
      if (mission.isLongTerm && isCompleted) {
        await db.collection(list).doc(_id).update({
          data: {
            available: false
          }
        });
        console.log('任务已标记为完成');
      }
      
      return {
        success: true,
        message: '审核通过，已发放积分',
        isCompleted: isCompleted,
        completedDays: completedDays,
        checkinUserId: record.checkinUserId // 返回打卡者openid，用于发送通知
      };
    } else if (action === 'reject') {
      // 审核驳回
      console.log('执行审核驳回操作');
      
      // 1. 更新打卡记录状态
      records[recordIndex] = {
        ...record,
        status: 'rejected',
        completed: false,
        auditTime: db.serverDate()
      };
      
      // 2. 更新任务数据
      await db.collection(list).doc(_id).update({
        data: {
          [recordField]: records
        }
      });
      console.log('驳回记录已更新');
      
      return {
        success: true,
        message: '审核已驳回',
        isCompleted: false,
        completedDays: mission.isLongTerm ? mission.completedDays : 0,
        checkinUserId: record.checkinUserId // 返回打卡者openid，用于发送通知
      };
    } else {
      console.error('无效的审核操作:', action);
      return { success: false, message: '无效的审核操作' };
    }
  } catch (error) {
    console.error('审核操作失败:', error);
    return { success: false, message: error.message };
  }
}
