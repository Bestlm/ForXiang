// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ // 初始化云开发环境
  env: cloud.DYNAMIC_CURRENT_ENV // 当前环境的常量
})
const db = cloud.database()
const db_date =  db.serverDate()

// 云函数入口函数
exports.main = async (context) => {
  const data = {
    _openid: cloud.getWXContext().OPENID,
    date: db_date,
    credit: Number(context.credit),
    title: context.title,
    desc: context.desc,
    available: true,
    star: false
  }

  if (context.isLongTerm) {
    data.isLongTerm = true
    data.totalDays = Number(context.totalDays)
    data.dailyCredit = Math.floor(Number(context.credit) / Number(context.totalDays))
    data.completedDays = 0
    data.dailyRecords = []
  } else {
    data.isLongTerm = false
  }

  // 3. 保存任务到数据库
  return await db.collection(context.list).add({
    data
  })
}