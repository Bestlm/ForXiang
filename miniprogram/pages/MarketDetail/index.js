Page({
  // 保存商品的 _id 和详细信息
  data: {
    _id: '',
    item: null,
    dateStr: '',
    creditPercent: 0,
    credit: 0,
    user: "",
    maxCredit: getApp().globalData.maxCredit,
    list: getApp().globalData.collectionMarketList,
    // 背景图片路径
    backgroundImage: '',
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
    return new Date(dateStr)
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

  // 验证用户身份
  async verifyUser() {
    const app = getApp();
    const authInfo = await app.verifyUser();
    
    console.log('用户验证结果:', authInfo);
    
    if(authInfo.valid){
      this.setData({
          user: authInfo.user,
          currentOpenid: authInfo.openid,
          another_openid: authInfo.another_openid,
      });
      return true;
    }else{
      console.error('用户未授权:', authInfo.error);
      throw new Error(authInfo.error || '用户未授权');
    }
  },

  // 根据 _id 值查询并显示商品
  async onShow() {
    if (this.data._id.length > 0) {
      try {
        // 验证用户身份
        await this.verifyUser();
        
        // 查询商品详情
        const data = await wx.cloud.callFunction({name: 'getElementById', data: this.data});
        
        if (data && data.result && data.result.data && data.result.data.length > 0) {
          const item = data.result.data[0];
          const date = this.getDate(item.date);
          this.setData({
            item: item,
            dateStr: this.formatDateTime(date),
            creditPercent: (item.credit / getApp().globalData.maxCredit) * 100,
          });

          const app = getApp();
          const authInfo = app.globalData.authInfo;
          if (authInfo && authInfo.openid) {
            if(this.data.item._openid === authInfo.openid){
              this.setData({
                from: authInfo.user === '然然' ? '小向' : '然然',
                to: authInfo.user,
              });
            }else if(this.data.item._openid === authInfo.another_openid){
              this.setData({
                from: authInfo.user,
                to: authInfo.user === '然然' ? '小向' : '然然',
              });
            }
          }
        } else {
          console.error('未找到商品数据:', data);
          wx.showToast({
            title: '未找到商品数据',
            icon: 'none',
            duration: 2000
          });
        }
      } catch (error) {
        console.error('获取商品详情失败:', error);
        if (error.message === '用户未授权') {
          wx.showToast({
            title: '您不是授权用户，无法访问商品详情',
            icon: 'none',
            duration: 2000
          });
        } else if (error.message.includes('云开发') || error.message.includes('网络')) {
          wx.showToast({
            title: '网络错误，请检查网络连接',
            icon: 'none',
            duration: 2000
          });
        } else {
          wx.showToast({
            title: '获取商品详情失败',
            icon: 'none',
            duration: 2000
          });
        }
      }
    }
  },
})