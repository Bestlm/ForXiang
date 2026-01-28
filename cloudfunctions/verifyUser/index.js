// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 授权用户集合名称
const AUTHORIZED_USERS_COLLECTION = 'AuthorizedUsers'

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const openid = cloud.getWXContext().OPENID
    console.log('当前用户openid:', openid)
    
    // 从数据库读取授权用户列表
    console.log('从数据库读取授权用户列表')
    const { data: authorizedUsers } = await db.collection(AUTHORIZED_USERS_COLLECTION).get()
    console.log('授权用户列表:', authorizedUsers)
    
    // 查找授权用户，同时检查openid和anotherOpenid
    const user = authorizedUsers.find(u => u.openid === openid || u.anotherOpenid === openid)
    
    if (user) {
      // 用户已授权
      console.log('匹配到的用户记录:', user)
      
      // 核心逻辑：根据当前登录的openid确定用户身份
      // 如果当前登录的openid等于user.openid，那么当前用户就是user.name
      // 如果当前登录的openid等于user.anotherOpenid，那么需要查找另一个用户记录
      
      const isMainOpenid = user.openid === openid
      let currentUserName = user.name
      
      if (!isMainOpenid && user.anotherOpenid === openid) {
        // 当前使用的是anotherOpenid，需要查找另一个用户记录
        const otherUser = authorizedUsers.find(u => 
          (u.openid === openid || u.anotherOpenid === openid) && u._id !== user._id
        )
        
        if (otherUser) {
          // 找到另一个用户记录，使用那个用户的名字
          currentUserName = otherUser.name
          console.log('使用anotherOpenid登录，匹配到另一个用户:', otherUser)
        } else {
          // 没有找到另一个用户记录，那么当前用户应该是另一个用户（然然->小向，小向->然然）
          currentUserName = user.name === '然然' ? '小向' : '然然'
          console.log('没有找到另一个用户记录，推断当前用户:', currentUserName)
        }
      }
      
      console.log('最终确定的用户身份:', currentUserName)
      
      return {
        valid: true,
        user: currentUserName,
        openid: user.openid,
        another_openid: user.anotherOpenid
      }
    } else {
      // 用户未授权
      console.log('用户未授权:', openid)
      return {
        valid: false,
        error: '用户未授权'
      }
    }
  } catch (error) {
    console.error('验证用户失败:', error)
    return {
      valid: false,
      error: error.message
    }
  }
}
