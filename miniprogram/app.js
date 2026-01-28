App({
  async onLaunch() {
    // 初始化平台信息
    this.initPlatformInfo()
    // 修复：在鸿蒙模式下也初始化云开发环境，以便获取真实数据
    // 即使是鸿蒙模式，也需要初始化云开发环境来获取真实数据
    this.initcloud()
    // 初始化Worker兼容处理，解决鸿蒙环境下的Worker相关错误
    this.initWorkerCompat()

    this.globalData = {
      //用于存储待办记录的集合名称
      collectionMissionList: 'MissionList',
      collectionMarketList: 'MarketList',
      collectionStorageList: 'StorageList',
      collectionUserList: 'UserList',

      //最多单次交易积分
      maxCredit: 20,
      
      //全局背景图片路径
      backgroundImage: '/images/HomeCover06.jpg',
      
      //认证信息缓存
      authInfo: null
    }
  },

  flag: false,

  /**
   * 初始化平台信息，判断是否为鸿蒙系统
   */
  initPlatformInfo() {
    try {
      // 手动开关：用于测试鸿蒙平台代码
      // 设置为false，恢复自动检测模式
      const forceHarmonyOS = false; // 设置为true可以强制启用鸿蒙模式，false为自动检测
      
      if (forceHarmonyOS) {
        // 强制启用鸿蒙模式，方便测试
        this.isHarmonyOS = true;
        this.originalPlatform = 'devtools';
        this.platform = 'harmonyos';
        console.log('🔴 强制启用鸿蒙模式，用于测试');
        console.log('当前平台：', this.platform, '原始平台：', this.originalPlatform, '是否鸿蒙：', this.isHarmonyOS);
        return;
      }
      
      // 使用新的API替代wx.getSystemInfoSync
      // 先获取设备信息
      let deviceInfo, systemSetting, platform, system;
      let systemInfo = null;
      
      console.log('=== 开始获取系统信息 ===');
      
      try {
        console.log('1. 尝试调用wx.getDeviceInfo()');
        deviceInfo = wx.getDeviceInfo();
        console.log('wx.getDeviceInfo()返回结果：', deviceInfo);
        
        console.log('2. 尝试调用wx.getSystemSetting()');
        systemSetting = wx.getSystemSetting();
        console.log('wx.getSystemSetting()返回结果：', systemSetting);
        
        // 修复：从deviceInfo中获取system，而不是从systemSetting中获取
        platform = deviceInfo.platform || '';
        system = deviceInfo.system || '';
      } catch (apiError) {
        console.log('3. 新API调用失败，使用降级方案', apiError.message);
        // 降级处理，使用原有的API
        try {
          console.log('4. 尝试调用wx.getSystemInfoSync()');
          systemInfo = wx.getSystemInfoSync();
          console.log('wx.getSystemInfoSync()返回结果：', systemInfo);
          platform = systemInfo.platform || '';
          system = systemInfo.system || '';
        } catch (syncError) {
          console.log('5. wx.getSystemInfoSync()调用也失败', syncError.message);
          // 最终降级处理
          platform = '';
          system = '';
        }
      }
      
      // 打印获取到的系统信息，方便调试
      console.log('=== 最终获取到的系统信息 ===');
      console.log('platform:', platform);
      console.log('system:', system);
      console.log('deviceInfo:', deviceInfo);
      console.log('systemSetting:', systemSetting);
      console.log('systemInfo:', systemInfo);
      
      // 改进的鸿蒙判断条件
      // 支持以下情况：
      // 1. 真机上platform为'ohos'
      // 2. 系统版本包含'HarmonyOS'
      // 3. 开发者工具中模拟鸿蒙时的特殊情况
      const isHarmonyFromSystem = system === 'HarmonyOS' || system.toLowerCase().includes('harmony')
      const isHarmonyFromPlatform = platform.toLowerCase() === 'ohos'
      const isHarmonyFromDevtools = platform === 'devtools' && system.toLowerCase().includes('harmony')
      
      // 同时支持正式环境和开发者工具模拟环境
      this.isHarmonyOS = isHarmonyFromSystem || isHarmonyFromPlatform || isHarmonyFromDevtools
      // 记录原始platform，方便调试
      this.originalPlatform = platform
      // 设置显示的平台名称
      this.platform = this.isHarmonyOS ? 'harmonyos' : platform
      
      // 打印平台识别结果
      console.log('=== 平台识别结果 ===');
      console.log(this.isHarmonyOS ? '🔴 识别到鸿蒙设备/环境：' : '🟢 识别到非鸿蒙设备/环境：', this.platform, '原始平台：', this.originalPlatform);
      console.log('识别条件匹配情况：');
      console.log('  - 系统包含Harmony：', isHarmonyFromSystem);
      console.log('  - 平台为ohos：', isHarmonyFromPlatform);
      console.log('  - 开发者工具模拟鸿蒙：', isHarmonyFromDevtools);
    } catch (error) {
      console.error('=== 获取系统信息失败 ===', error);
      // 最终降级处理，默认识别为非鸿蒙设备
      this.isHarmonyOS = false
      this.originalPlatform = 'unknown'
      this.platform = 'unknown'
      console.log('⚠️  获取系统信息失败，默认识别为非鸿蒙设备');
      console.log('当前平台：', this.platform, '原始平台：', this.originalPlatform, '是否鸿蒙：', this.isHarmonyOS)
    }
  },

  /**
   * 初始化云开发环境
   */
  async initcloud() {
    try {
      const normalinfo = require('./envList.js').envList || [] // 读取 envlist 文件
      if (normalinfo.length != 0 && normalinfo[0].envId != null) { // 如果文件中 envlist 存在
        wx.cloud.init({ // 初始化云开发环境
          traceUser: true,
          env: normalinfo[0].envId
        })
        // 装载云函数操作对象返回方法
        this.cloud = () => {
          return wx.cloud // 直接返回 wx.cloud
        }
      } else { // 如果文件中 envlist 不存在，提示要配置环境
        this.cloud = () => {
          wx.showModal({
            content: '无云开发环境', 
            showCancel: false
          })
          throw new Error('无云开发环境')
        }
      }
    } catch (error) {
      console.error('初始化云开发环境失败：', error)
      this.cloud = () => {
        throw new Error('云开发初始化失败：' + error.message)
      }
    }
  },

  // 获取云数据库实例
  async database() {
    return (await this.cloud()).database()
  },

  // 鸿蒙兼容的云函数调用
  callFunction(options) {
    // 所有平台都调用真实的云函数，获取真实数据
    // 不再区分设备类型，统一使用真实云函数调用
    console.log('🟢 调用真实云函数：', options.name)
    
    // 直接调用真实的云开发函数，获取真实数据
    return new Promise((resolve, reject) => {
      try {
        // 调用真实的云函数
        // 不使用扩展运算符，避免Babel依赖问题
        const cloudFunctionOptions = {
          name: options.name,
          data: options.data,
          success: (res) => {
            console.log('云函数调用成功：', options.name, res)
            resolve(res)
          },
          fail: (err) => {
            console.error('云函数调用失败：', options.name, err)
            reject(err)
          }
        }
        wx.cloud.callFunction(cloudFunctionOptions)
      } catch (error) {
        console.error('调用云函数时发生异常：', options.name, error)
        reject(error)
      }
    })
  },

  // 全局用户认证方法，带缓存
  async verifyUser() {
    // 检查是否有缓存的认证信息
    if (this.globalData.authInfo) {
      console.log('🟢 使用缓存的认证信息')
      return this.globalData.authInfo
    }
    
    console.log('🔄 开始用户认证')
    
    try {
      // 调用认证云函数
      const res = await this.callFunction({ name: 'verifyUser' })
      
      if (res && res.result) {
        // 缓存认证结果
        this.globalData.authInfo = res.result
        console.log('✅ 认证成功，已缓存认证信息：', res.result)
        return res.result
      } else {
        console.error('❌ 认证失败：返回结果无效', res)
        return { valid: false, error: '认证返回结果无效' }
      }
    } catch (error) {
      console.error('❌ 认证过程出错：', error)
      return { valid: false, error: error.message || '认证过程出错' }
    }
  },

  // 清除认证缓存
  clearAuthCache() {
    this.globalData.authInfo = null
    console.log('🗑️ 已清除认证缓存')
  },

  // 鸿蒙兼容的显示模态对话框
  showModal(options) {
    if (this.isHarmonyOS) {
      // 鸿蒙平台处理
      console.log('鸿蒙平台不支持showModal，模拟实现：', options)
      // 可以使用其他方式替代，或者简化处理
      return Promise.resolve({ confirm: true })
    } else {
      // 微信平台正常调用
      return new Promise((resolve, reject) => {
        // 不使用扩展运算符，避免Babel依赖问题
        const showModalOptions = {
          title: options.title,
          content: options.content,
          showCancel: options.showCancel !== undefined ? options.showCancel : true,
          cancelText: options.cancelText || '取消',
          confirmText: options.confirmText || '确定',
          editable: options.editable || false,
          placeholderText: options.placeholderText || '',
          success: resolve,
          fail: reject
        }
        wx.showModal(showModalOptions)
      })
    }
  },

  // 鸿蒙兼容的显示提示
  showToast(options) {
    if (this.isHarmonyOS) {
      // 鸿蒙平台处理
      console.log('鸿蒙平台不支持showToast，模拟实现：', options)
      return Promise.resolve()
    } else {
      // 微信平台正常调用
      return new Promise((resolve, reject) => {
        // 不使用扩展运算符，避免Babel依赖问题
        const showToastOptions = {
          title: options.title,
          icon: options.icon || 'success',
          duration: options.duration || 1500,
          mask: options.mask || false,
          success: resolve,
          fail: reject
        }
        wx.showToast(showToastOptions)
      })
    }
  },

  // 鸿蒙兼容的显示加载提示
  showLoading(options) {
    if (this.isHarmonyOS) {
      // 鸿蒙平台处理
      console.log('鸿蒙平台不支持showLoading，模拟实现：', options)
      return Promise.resolve()
    } else {
      // 微信平台正常调用
      return new Promise((resolve, reject) => {
        // 不使用扩展运算符，避免Babel依赖问题
        const showLoadingOptions = {
          title: options.title || '加载中',
          mask: options.mask || false,
          success: resolve,
          fail: reject
        }
        wx.showLoading(showLoadingOptions)
      })
    }
  },

  // 鸿蒙兼容的隐藏加载提示
  hideLoading() {
    if (this.isHarmonyOS) {
      // 鸿蒙平台处理
      console.log('鸿蒙平台不支持hideLoading，模拟实现')
      return Promise.resolve()
    } else {
      // 微信平台正常调用
      return new Promise((resolve, reject) => {
        wx.hideLoading({
          success: resolve,
          fail: reject
        })
      })
    }
  },

  // 鸿蒙兼容的页面导航
  navigateTo(options) {
    if (this.isHarmonyOS) {
      // 鸿蒙平台处理
      console.log('鸿蒙平台不支持navigateTo，模拟实现：', options)
      return Promise.resolve()
    } else {
      // 微信平台正常调用
      return new Promise((resolve, reject) => {
        // 不使用扩展运算符，避免Babel依赖问题
        const navigateToOptions = {
          url: options.url,
          events: options.events || {},
          success: resolve,
          fail: reject
        }
        wx.navigateTo(navigateToOptions)
      })
    }
  },

  // 鸿蒙兼容的页面返回
  navigateBack(options) {
    if (this.isHarmonyOS) {
      // 鸿蒙平台处理
      console.log('鸿蒙平台不支持navigateBack，模拟实现：', options)
      return Promise.resolve()
    } else {
      // 微信平台正常调用
      return new Promise((resolve, reject) => {
        // 不使用扩展运算符，避免Babel依赖问题
        const navigateBackOptions = {
          delta: options.delta || 1,
          success: resolve,
          fail: reject
        }
        wx.navigateBack(navigateBackOptions)
      })
    }
  },

  // 鸿蒙兼容的页面重定向
  redirectTo(options) {
    if (this.isHarmonyOS) {
      // 鸿蒙平台处理
      console.log('鸿蒙平台不支持redirectTo，模拟实现：', options)
      return Promise.resolve()
    } else {
      // 微信平台正常调用
      return new Promise((resolve, reject) => {
        // 不使用扩展运算符，避免Babel依赖问题
        const redirectToOptions = {
          url: options.url,
          success: resolve,
          fail: reject
        }
        wx.redirectTo(redirectToOptions)
      })
    }
  },

  // 鸿蒙兼容的获取设置
  getSetting(options) {
    if (this.isHarmonyOS) {
      // 鸿蒙平台处理
      console.log('鸿蒙平台不支持getSetting，模拟实现：', options)
      // 返回模拟数据
      return Promise.resolve({
        authSetting: {
          "scope.userInfo": true
        },
        subscriptionsSetting: {
          mainSwitch: true,
          itemSettings: {}
        }
      })
    } else {
      // 微信平台正常调用
      return new Promise((resolve, reject) => {
        // 不使用扩展运算符，避免Babel依赖问题
        const getSettingOptions = {
          withSubscriptions: options.withSubscriptions || false,
          success: resolve,
          fail: reject
        }
        wx.getSetting(getSettingOptions)
      })
    }
  },

  // 鸿蒙兼容的停止下拉刷新
  stopPullDownRefresh() {
    if (this.isHarmonyOS) {
      // 鸿蒙平台处理
      console.log('鸿蒙平台不支持stopPullDownRefresh，模拟实现')
      return Promise.resolve()
    } else {
      // 微信平台正常调用
      return new Promise((resolve, reject) => {
        wx.stopPullDownRefresh({
          success: resolve,
          fail: reject
        })
      })
    }
  },

  // 鸿蒙兼容的创建选择器查询
  createSelectorQuery() {
    if (this.isHarmonyOS) {
      // 鸿蒙平台处理
      console.log('鸿蒙平台不支持createSelectorQuery，模拟实现')
      // 返回模拟对象，包含必要的方法
      return {
        in: function() {
          return this
        },
        select: function() {
          return {
            boundingClientRect: function() {
              return this
            },
            exec: function(callback) {
              callback && callback([])
              return []
            }
          }
        },
        selectAll: function() {
          return {
            boundingClientRect: function() {
              return this
            },
            exec: function(callback) {
              callback && callback([])
              return []
            }
          }
        },
        exec: function(callback) {
          callback && callback([])
          return []
        }
      }
    } else {
      // 微信平台正常调用
      return wx.createSelectorQuery()
    }
  },



  // 鸿蒙兼容的预览图片
  previewImage(options) {
    if (this.isHarmonyOS) {
      // 鸿蒙平台处理
      console.log('鸿蒙平台不支持previewImage，模拟实现：', options)
      return Promise.resolve()
    } else {
      // 微信平台正常调用
      return new Promise((resolve, reject) => {
        // 不使用扩展运算符，避免Babel依赖问题
        const previewImageOptions = {
          current: options.current || '',
          urls: options.urls || [],
          success: resolve,
          fail: reject
        }
        wx.previewImage(previewImageOptions)
      })
    }
  },

  // 鸿蒙兼容的Worker相关API包装，避免基础库调用不支持的Worker功能
  // 主要用于解决[worker] reportRealtimeAction:fail not support错误
  initWorkerCompat() {
    if (this.isHarmonyOS) {
      // 在鸿蒙环境下，重写或禁用Worker相关的全局API
      console.log('🔴 鸿蒙环境下初始化Worker兼容性处理')
      
      // 禁用Worker相关API调用
      if (typeof globalThis.Worker === 'function') {
        console.log('🔴 鸿蒙环境下禁用Worker构造函数')
        globalThis.Worker = function() {
          console.warn('🔴 鸿蒙环境不支持Worker')
          throw new Error('Worker is not supported in HarmonyOS environment')
        }
      }
      
      // 禁用reportRealtimeAction相关功能
      if (wx.reportRealtimeAction) {
        console.log('🔴 鸿蒙环境下禁用reportRealtimeAction')
        const originalReportRealtimeAction = wx.reportRealtimeAction
        // 不使用剩余参数语法，避免Babel依赖问题
        wx.reportRealtimeAction = function() {
          console.warn('🔴 鸿蒙环境不支持reportRealtimeAction，跳过调用')
          // 返回空对象，避免后续调用出错
          return { fail: function() {} }
        }
      }
      
      // 禁用其他可能导致Worker错误的API
      if (wx.createWorker) {
        console.log('🔴 鸿蒙环境下禁用createWorker')
        wx.createWorker = function() {
          console.warn('🔴 鸿蒙环境不支持createWorker')
          return { 
            postMessage: function() {},
            onMessage: function() {},
            terminate: function() {}
          }
        }
      }
    }
  },
})