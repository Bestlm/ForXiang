Page({
  // 保存物品的 _id 和详细信息
  data: {
    _id: '',
    item: null,
    dateStr: '',
    creditPercent: 0,
    credit: 0,
    user: "",
    maxCredit: getApp().globalData.maxCredit,
    list: getApp().globalData.collectionStorageList,
    // 背景图片路径
    backgroundImage: '',
    // 隐藏背景图片
    hideBackground: true,
  },

  onLoad(options) {
    if (options.id !== undefined) {
      this.setData({
        _id: options.id,
        // 设置背景图片路径
        backgroundImage: getApp().globalData.backgroundImage
      })
    }
  },

  getDate(dateStr){
    const milliseconds = Date.parse(dateStr)
    const date = new Date()
    date.setTime(milliseconds)
    return date
  },

  formatDateTime(date){
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    
    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`
  },

  // 根据 _id 值查询并显示物品
  async onShow() {
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
      
      if (this.data._id && this.data._id.length > 0) {
        // 只传递必要的参数给云函数
        const cloudData = {
          _id: this.data._id,
          list: this.data.list
        };
        const data = await app.callFunction({name: 'getElementById', data: cloudData});
        const item = data.result.data[0];
        if (item) {
          const date = this.getDate(item.date);
          let useTimeStr = '';
          if (item.useTime) {
            const useTime = this.getDate(item.useTime);
            useTimeStr = this.formatDateTime(useTime);
          }
          this.setData({
            item: item,
            dateStr: this.formatDateTime(date),
            useTimeStr: useTimeStr,
            creditPercent: (item.credit / app.globalData.maxCredit) * 100,
          });

          const authInfo = app.globalData.authInfo;
          if (authInfo && authInfo.openid) {
            if(item._openid === authInfo.openid){
              this.setData({
                from: authInfo.user === '然然' ? '小向' : '然然',
                to: authInfo.user,
              });
            }else if(item._openid === authInfo.another_openid){
              this.setData({
                from: authInfo.user,
                to: authInfo.user === '然然' ? '小向' : '然然',
              });
            }
          }
        } else {
          wx.showToast({
            title: '物品不存在',
            icon: 'error',
            duration: 2000
          });
        }
      }
    } catch (error) {
      console.error('查询物品详情失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'error',
        duration: 2000
      });
    }
  },
})