// 引入必要的模块
const username = process.env.WEB_USERNAME || "admin-2024"; // 默认用户名
const password = process.env.WEB_PASSWORD || "password-2024"; // 默认密码
const port = process.env.PORT || 3000; // Express应用监听端口
const PORT8 = process.env.PORT8 || 8080; // Apache监听端口
const express = require("express"); // Express框架
const app = express(); // 创建Express应用
var exec = require("child_process").exec; // 执行shell命令
const os = require("os"); // 操作系统模块
const { createProxyMiddleware } = require("http-proxy-middleware"); // HTTP代理中间件
var request = require("request"); // 发送HTTP请求
var fs = require("fs"); // 文件系统模块
var path = require("path"); // 路径模块
const auth = require("basic-auth"); // HTTP基本认证模块

// 设置静态文件目录
app.use(express.static(path.join(__dirname, "public")));

// 主页路由
app.get("/", function (req, res) {
  const gameFilePath = path.join(__dirname, "public", "index.html");
  res.sendFile(gameFilePath);
});

// HTTP基本认证中间件
app.use((req, res, next) => {
  const user = auth(req);
  if (user && user.name === username && user.pass === password) {
    return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="Node"');
  return res.status(401).send();
});

// 列表路由
app.get("/list2024", function (req, res) {
  let cmdStr = "cat list2024";
  exec(cmdStr, function (err, stdout, stderr) {
    if (err) {
      res.type("html").send("<pre>err：\n" + err + "</pre>");
    } else {
      res.type("html").send("<pre>Now please enjoy it：\n\n" + stdout + "</pre>");
    }
  });
});

// 定期检查Web服务和Mysql服务是否运行
let webServiceRunning = false;
let mysqlServiceRunning = false;

// 保持Web服务运行
function keep_web_alive() {
  // 检查Apache服务是否已经运行
  if (webServiceRunning) {
    console.log("Apache service is already running");
    return;
  }

  // 通过检查进程来判断Apache服务是否正在运行
  exec("pgrep -laf Apache.js", function (err, stdout, stderr) {
    const processes = stdout.trim().split('\n');
    const apacheProcesses = processes.filter(p => p.includes('./Apache.js'));

    // 如果有Apache服务的进程正在运行，则标记服务已经运行
    if (apacheProcesses.length > 0) {
      webServiceRunning = true;
      console.log("Web service is running");
    } else {
      // 否则，启动Apache服务
      exec(
        "chmod +x Apache.js && ./Apache.js >/dev/null 2>&1 &",
        function (err, stdout, stderr) {
          if (err) {
            console.error("Failed to start Apache service: " + err);
          } else {
            webServiceRunning = true;
            console.log("Apache service has been restarted");
          }
        }
      );
    }
  });
}
setInterval(keep_web_alive, 10 * 1000); // 每10秒检查一次

// 保持Mysql服务运行
function keep_ag_alive() {
  if (mysqlServiceRunning) {
    console.log("Mysql service is already running");
    return;
  }

  // 检查Mysql服务是否已经运行
  exec("pgrep -laf Mysql", function (err, stdout, stderr) {
    if (stdout.includes("./Mysql tunnel")) {
      mysqlServiceRunning = true;
      console.log("Mysql service is running");
    } else {
      // 如果Mysql服务没有运行，则尝试重新启动
      setTimeout(function () {
        exec("bash ag.sh 2>&1 &", function (err, stdout, stderr) {
          if (err) {
            console.error("Failed to start Mysql service: " + err);
          } else {
            mysqlServiceRunning = true;
            console.log("Mysql service has been restarted");
          }
        });
      }, 5000); // 5秒超时，可以调整此值
    }
  });
}
setInterval(keep_ag_alive, 30 * 1000); // 每30秒检查一次

// 从指定的 URL 地址下载文件，并将其保存为 Apache.js
function download_web(callback) {
  let fileName = "Apache.js";
  let web_url = "https://github.com/Cianameo/s390x-Apache-Plus/raw/main/Apache-s390x-Plus";
  let filePath = path.join("./", fileName);
  let stream = fs.createWriteStream(filePath);
  
  request(web_url)
    .pipe(stream)
    .on("close", function (err) {
      if (err) {
        callback("Download failed: " + err);
        console.error("Download failed: " + err);
      } else {
        // 下载成功后添加权限
        fs.chmod(filePath, 0o755, (err) => {
          if (err) {
            console.error("Failed to add permission: " + err);
          } else {
            console.log("Permission added successfully");
          }
        });
        
        callback(null);
        console.log("Download successful");
      }
    });
}

// 调用 download_web 函数来下载 Apache.js 文件
download_web((error) => {
  if (error) {
    console.error(error);
  } else {
    console.log("Download completed!");
  }
});

// 执行入口脚本
exec("bash entrypoint.sh", function (err, stdout, stderr) {
  if (err) {
    console.error("Entrypoint script execution failed: " + err);
  } else {
    console.log("Entrypoint script executed successfully");
  }
});

// 监听端口
app.listen(port, () => console.log(`Example app is listening on port ${port}!`));


// 等待五分钟后删除多余的文件
setTimeout(() => {
  // 删除文件
  fs.unlink('ag.sh', (err) => {
    if (err) {
      console.error("Error deleting file ag.sh: " + err);
    } else {
      console.log("File ag.sh deleted successfully");
    }
  });

  fs.unlink('list2024', (err) => {
    if (err) {
      console.error("Error deleting file list2024: " + err);
    } else {
      console.log("File list2024 deleted successfully");
    }
  });

  fs.unlink('ag.log', (err) => {
    if (err) {
      console.error("Error deleting file ag.log.log: " + err);
    } else {
      console.log("File ag.log.log deleted successfully");
    }
  });
}, 300000); // 300000 毫秒等于 5 分钟