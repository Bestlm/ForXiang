// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ // 初始化云开发环境
  env: cloud.DYNAMIC_CURRENT_ENV // 当前环境的常量
})
const db = cloud.database()

// 云函数入口函数
exports.main = async (event) => {
  // 根据待办的 _openid 找到并返回
  return await db.collection(event.list).where({
    _openid: event._openid
  }).get()
}