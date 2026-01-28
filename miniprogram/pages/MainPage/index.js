/* Main page of the app */
Page({
  data: {
      creditA: 0,
      creditB: 0,

      userA: '',
      userB: '',
      currentUser: '', // 当前登录的用户名字

      daysInLove: 0,
      
      // 背景图片路径
      backgroundImage: ''
  },

  async onShow(){
      try {
          const app = getApp();
          // 验证用户身份
          const authInfo = await app.verifyUser();
          if (!authInfo.valid) {
              wx.showToast({
                  title: authInfo.error || '未授权访问',
                  icon: 'error',
                  duration: 2000
              });
              return;
          }
          
          // 获取两个用户的积分
          if (authInfo.openid && authInfo.another_openid) {
              // 保持userA固定为"然然"，userB固定为"小向"，以确保颜色显示正确
              // 粉色对应然然，蓝色对应小向
              
              try {
                // 1. 从AuthorizedUsers数据库获取所有用户信息
                console.log('从AuthorizedUsers获取所有用户信息');
                const authorizedUsersRes = await app.callFunction({name: 'getList', data: {list: 'AuthorizedUsers'}});
                console.log('授权用户列表结果:', authorizedUsersRes);
                
                if (authorizedUsersRes && authorizedUsersRes.result && authorizedUsersRes.result.data) {
                  const authorizedUsers = authorizedUsersRes.result.data;
                  console.log('授权用户列表:', authorizedUsers);
                  
                  // 2. 查找然然和小向的用户信息
                  const ranranUser = authorizedUsers.find(u => u.name === '然然');
                  const xiangxiangUser = authorizedUsers.find(u => u.name === '小向');
                  
                  console.log('找到的然然用户:', ranranUser);
                  console.log('找到的小向用户:', xiangxiangUser);
                  
                  // 3. 根据找到的用户信息获取积分
                  // 获取然然的积分
                  if (ranranUser) {
                    // 使用然然的openid查询积分
                    const ranranOpenid = ranranUser.openid;
                    console.log('获取然然积分，openid:', ranranOpenid);
                    await this.getCredit(ranranOpenid, 'creditA');
                  } else {
                    console.error('未找到然然的授权用户信息');
                    this.setData({creditA: 0});
                  }
                  
                  // 获取小向的积分
                  if (xiangxiangUser) {
                    // 使用小向的openid查询积分
                    const xiangxiangOpenid = xiangxiangUser.openid;
                    console.log('获取小向积分，openid:', xiangxiangOpenid);
                    await this.getCredit(xiangxiangOpenid, 'creditB');
                  } else {
                    console.error('未找到小向的授权用户信息');
                    this.setData({creditB: 0});
                  }
                } else {
                  // 如果获取授权用户列表失败，使用当前认证信息获取积分
                  console.error('获取授权用户列表失败，使用认证信息获取积分');
                  
                  // 获取当前用户的积分
                  const currentUser = authInfo.user;
                  await this.getCredit(authInfo.openid, currentUser === '然然' ? 'creditA' : 'creditB');
                  
                  // 获取另一个用户的积分
                  await this.getCredit(authInfo.another_openid, currentUser === '然然' ? 'creditB' : 'creditA');
                }
              } catch (error) {
                console.error('获取积分失败:', error);
                // 设置默认值
                this.setData({creditA: 0, creditB: 0});
              }
          }
          
          this.setData({
              userA: '然然', // 固定为然然，对应粉色
              userB: '小向', // 固定为小向，对应蓝色
              currentUser: authInfo.user, // 当前登录的用户名字
              backgroundImage: app.globalData.backgroundImage
          });
      } catch (error) {
          console.error('加载失败:', error);
          wx.showToast({
              title: '加载失败',
              icon: 'error',
              duration: 2000
          });
      }
  },

  // 获取用户积分
  async getCredit(openid, creditKey){
    try {
      const app = getApp();
      console.log(`获取用户积分，openid: ${openid}, 存储键: ${creditKey}`);
      const res = await app.callFunction({name: 'getElementByOpenId', data: {list: app.globalData.collectionUserList, _openid: openid}});
      console.log('用户积分获取结果:', res);
      // 检查res和res.result是否存在
      if(res && res.result && res.result.data && res.result.data.length > 0){
        this.setData({[creditKey]: res.result.data[0].credit});
        console.log(`用户积分设置成功: ${res.result.data[0].credit} (${creditKey})`);
      } else {
        console.error('用户积分数据格式错误:', res);
      }
    } catch (err) {
      console.error(`获取用户积分失败: ${err}`);
    }
  },

  onLoad() {
    const startDate = new Date(2025, 10, 25); // 注意月份从0开始计算
    const now = new Date();
    const diffTime = now - startDate;
    this.setData({
      daysInLove: Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1
    });
  }
})