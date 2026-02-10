
      (() => {
        const Phone = document.getElementById("Phone");
        const LockScreen = document.getElementById("LockScreen");
        const HomeScreen = document.getElementById("HomeScreen");
        const AppContainer = document.getElementById("AppContainer");
        const ControlPanel = document.getElementById("ControlPanel");
        const NotificationCenter =
          document.getElementById("NotificationCenter");
        const ServiceCenter = document.getElementById("ServiceCenter");
        const SheetLayer = document.getElementById("SheetLayer");
        const DialogLayer = document.getElementById("DialogLayer");
        const Keyboard = document.getElementById("Keyboard");
        const TaskSwitcher = document.getElementById("TaskSwitcher");
        const taskTitle = document.getElementById("taskTitle");
        const taskSnapshot = document.getElementById("taskSnapshot");

        function initAppIcons() {
          const nodes = document.querySelectorAll("[data-lucide]");
          if (window.lucide && typeof window.lucide.createIcons === "function") {
            window.lucide.createIcons();
            return;
          }
          const fallback = {
            "layout-grid": "▦",
            images: "▧",
            "phone-call": "☎",
            settings: "⚙",
            phone: "✆",
            "message-circle": "✉",
            globe: "◍",
            camera: "◉"
          };
          nodes.forEach((node) => {
            const key = node.getAttribute("data-lucide") || "";
            node.textContent = fallback[key] || "◉";
            node.style.fontStyle = "normal";
            node.style.fontWeight = "700";
            node.style.fontSize = "13px";
            node.style.lineHeight = "1";
          });
        }

        const state = {
          locked: true,
          currentApp: null,
          appStack: [],
          focusedInput: null,
          cameraStream: null,
          callActive: false,
          meetimeActive: false,
          calcExpr: "",
          galleryItems: [],
          editorBinding: null,
        };

        initAppIcons();

        function setTime() {
          const now = new Date();
          const hh = String(now.getHours()).padStart(2, "0");
          const mm = String(now.getMinutes()).padStart(2, "0");
          const cnWeek = "日一二三四五六"[now.getDay()];
          const dateText = `${now.getMonth() + 1}月${now.getDate()}日 星期${cnWeek}`;
          const t = `${hh}:${mm}`;
          document.getElementById("lockStatusTime").textContent = t;
          document.getElementById("lockTime").textContent = t;
          document.getElementById("homeTime").textContent = t;
          document.getElementById("lockDate").textContent = dateText;
        }

        setTime();
        setInterval(setTime, 1000);

        const showLayer = (layer) => layer.classList.add("active");
        const hideLayer = (layer) => layer.classList.remove("active");

        function closeOverlays() {
          hideLayer(ControlPanel);
          hideLayer(NotificationCenter);
          hideLayer(ServiceCenter);
        }

        function unlockPhone() {
          state.locked = false;
          hideLayer(LockScreen);
          showLayer(HomeScreen);
          showSheet("已解锁");
        }

        function appName(appId) {
          const map = {
            settings: "设置",
            gallery: "图库",
            servicecenter: "服务中心",
            meetime: "MeeTime",
            phone: "电话",
            files: "文件",
            browser: "浏览器",
            camera: "相机",
            messages: "信息/邮件",
            calculator: "计算器",
            editor: "文本编辑器",
          };
          return map[appId] || appId;
        }

        function goHome() {
          closeOverlays();
          hideLayer(AppContainer);
          TaskSwitcher.classList.remove("active");
          showLayer(HomeScreen);
          if (state.currentApp === "camera") stopCamera();
          state.currentApp = null;
        }

        function openApp(appId, fromBack) {
          if (!fromBack && state.currentApp)
            state.appStack.push(state.currentApp);
          closeOverlays();
          showLayer(AppContainer);
          hideLayer(HomeScreen);

          document
            .querySelectorAll(".app-page")
            .forEach((page) => page.classList.remove("active"));
          const page = document.getElementById(`app-${appId}`);
          if (!page) return;
          page.classList.add("active");

          state.currentApp = appId;
          taskTitle.textContent = `最近任务 · ${appName(appId)}`;
          taskSnapshot.textContent = `${appName(appId)} 正在运行`;

          if (appId === "camera") startCamera();
          if (appId !== "camera") stopCamera();
          if (appId === "editor") {
            if (state.editorBinding && state.editorBinding.path) {
              loadFsFileIntoEditor(state.editorBinding.path, true);
            } else {
              loadEditor();
            }
          }
        }

        function goBack() {
          closeOverlays();
          if (state.currentApp === "camera") stopCamera();
          const prev = state.appStack.pop();
          if (prev) openApp(prev, true);
          else goHome();
        }

        document.querySelectorAll("[data-app-open]").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const appId = btn.getAttribute("data-app-open");
            if (appId === "editor") state.editorBinding = null;
            openApp(appId);
          });
        });

        document
          .querySelectorAll("[data-nav='back']")
          .forEach((btn) => btn.addEventListener("click", goBack));
        document.querySelectorAll("[data-close-overlay]").forEach((btn) => {
          btn.addEventListener("click", () =>
            hideLayer(document.getElementById(btn.dataset.closeOverlay)),
          );
        });

        document.querySelectorAll("[data-toggle-quick]").forEach((btn) => {
          btn.addEventListener("click", () => btn.classList.toggle("active"));
        });

        document.querySelectorAll(".setting-switch").forEach((sw) => {
          sw.addEventListener("click", () => sw.classList.toggle("on"));
        });

        document
          .getElementById("brightnessSlider")
          .addEventListener("input", (e) => {
            const v = Number(e.target.value) / 100;
            Phone.style.filter = `brightness(${Math.max(0.55, v)})`;
          });

        const homeSearch = document.getElementById("homeSearch");
        const homeSearchResults = document.getElementById("homeSearchResults");
        const homeSearchApps = [
          { id: "settings", name: "设置" },
          { id: "gallery", name: "图库" },
          { id: "servicecenter", name: "服务中心" },
          { id: "meetime", name: "MeeTime" },
          { id: "phone", name: "电话" },
          { id: "files", name: "文件" },
          { id: "browser", name: "浏览器" },
          { id: "camera", name: "相机" },
          { id: "messages", name: "信息/邮件" },
          { id: "calculator", name: "计算器" },
          { id: "editor", name: "文本编辑器" },
        ];

        function hideHomeSearchResults() {
          homeSearchResults.classList.remove("active");
          homeSearchResults.innerHTML = "";
        }

        function openFromHomeSearchWeb(query) {
          openApp("browser");
          urlInput.value = query;
          openWebByInput(false);
          hideHomeSearchResults();
        }

        function renderHomeSearchResults(rawQuery) {
          const query = (rawQuery || "").trim();
          if (!query) {
            hideHomeSearchResults();
            return;
          }
          const qLower = query.toLowerCase();
          const appHits = homeSearchApps
            .filter(
              (app) =>
                app.name.includes(query) ||
                app.id.includes(qLower) ||
                app.name.toLowerCase().includes(qLower),
            )
            .slice(0, 6);

          homeSearchResults.innerHTML = "";

          if (appHits.length) {
            const appTitle = document.createElement("div");
            appTitle.className = "search-group-title";
            appTitle.textContent = "应用";
            homeSearchResults.appendChild(appTitle);

            appHits.forEach((app) => {
              const btn = document.createElement("button");
              btn.className = "search-result-item";
              btn.textContent = `打开应用 · ${app.name}`;
              btn.addEventListener("click", () => {
                homeSearch.value = "";
                if (app.id === "editor") state.editorBinding = null;
                openApp(app.id);
                hideHomeSearchResults();
              });
              homeSearchResults.appendChild(btn);
            });
          }

          const webTitle = document.createElement("div");
          webTitle.className = "search-group-title";
          webTitle.textContent = "网页";
          homeSearchResults.appendChild(webTitle);

          const normalized = normalizeWebInput(query);
          const webOpen = document.createElement("button");
          webOpen.className = "search-result-item";
          webOpen.textContent = `打开网址 · ${normalized}`;
          webOpen.addEventListener("click", () => openFromHomeSearchWeb(normalized));
          homeSearchResults.appendChild(webOpen);

          if (!query.includes(".") && !query.startsWith("http")) {
            const webSearch = document.createElement("button");
            webSearch.className = "search-result-item";
            webSearch.textContent = `网页搜索 · ${query}`;
            webSearch.addEventListener("click", () => openFromHomeSearchWeb(query));
            homeSearchResults.appendChild(webSearch);
          }

          homeSearchResults.classList.add("active");
        }

        homeSearch.addEventListener("input", (e) => {
          renderHomeSearchResults(e.target.value);
        });

        homeSearch.addEventListener("focus", () => {
          if (homeSearch.value.trim()) renderHomeSearchResults(homeSearch.value);
        });

        homeSearch.addEventListener("keydown", (e) => {
          if (e.key !== "Enter") return;
          const query = homeSearch.value.trim();
          if (!query) return;
          const exactApp = homeSearchApps.find((a) => a.name === query);
          if (exactApp) {
            if (exactApp.id === "editor") state.editorBinding = null;
            openApp(exactApp.id);
            homeSearch.value = "";
            hideHomeSearchResults();
            return;
          }
          openFromHomeSearchWeb(query);
          homeSearch.value = "";
        });

        let gesture = null;
        Phone.addEventListener("pointerdown", (e) => {
          if (
            e.target.closest(".device-bubble") ||
            e.target.closest("#Keyboard")
          )
            return;
          const r = Phone.getBoundingClientRect();
          const x = e.clientX - r.left;
          const y = e.clientY - r.top;
          gesture = { sx: x, sy: y, ex: x, ey: y, t: Date.now(), type: "" };

          if (state.locked) {
            gesture.type = "unlock";
            return;
          }

          if (y < 34) {
            gesture.type = x < r.width / 2 ? "top-left" : "top-right";
          } else if (y > r.height - 26) {
            if (x < 66 || x > r.width - 66) gesture.type = "corner";
            else gesture.type = "bottom";
          } else if ((x < 18 || x > r.width - 18) && state.currentApp) {
            gesture.type = "edge";
          }
        });

        Phone.addEventListener("pointermove", (e) => {
          if (!gesture) return;
          const r = Phone.getBoundingClientRect();
          gesture.ex = e.clientX - r.left;
          gesture.ey = e.clientY - r.top;
        });

        Phone.addEventListener("pointerup", () => {
          if (!gesture) return;
          const dx = gesture.ex - gesture.sx;
          const dy = gesture.ey - gesture.sy;
          const dt = Date.now() - gesture.t;

          if (state.locked && gesture.type === "unlock") {
            if (dy < -88) unlockPhone();
            gesture = null;
            return;
          }

          if (gesture.type === "top-left" && dy > 80) {
            showLayer(NotificationCenter);
            hideLayer(ControlPanel);
            hideLayer(ServiceCenter);
          } else if (gesture.type === "top-right" && dy > 80) {
            showLayer(ControlPanel);
            hideLayer(NotificationCenter);
            hideLayer(ServiceCenter);
          } else if (gesture.type === "bottom" && dy < -88) {
            if (state.currentApp && dt > 420) {
              showLayer(AppContainer);
              TaskSwitcher.classList.add("active");
            } else {
              goHome();
            }
          } else if (
            gesture.type === "corner" &&
            dy < -88 &&
            ((gesture.sx < 66 && dx > 18) || (gesture.sx > 320 && dx < -18))
          ) {
            showLayer(ServiceCenter);
            hideLayer(ControlPanel);
            hideLayer(NotificationCenter);
          } else if (gesture.type === "edge" && dt < 620) {
            if ((gesture.sx < 18 && dx > 86) || (gesture.sx > 370 && dx < -86))
              goBack();
          }
          gesture = null;
        });

        TaskSwitcher.addEventListener("click", () =>
          TaskSwitcher.classList.remove("active"),
        );

        document.addEventListener("click", (e) => {
          if (e.target === ControlPanel) hideLayer(ControlPanel);
          if (e.target === NotificationCenter) hideLayer(NotificationCenter);
          if (e.target === ServiceCenter) hideLayer(ServiceCenter);
          if (
            !e.target.closest("#homeSearchResults") &&
            !e.target.closest("#homeSearch")
          ) {
            hideHomeSearchResults();
          }
        });

        function showSheet(text, duration = 1800) {
          const n = document.createElement("div");
          n.className = "sheet";
          n.textContent = text;
          SheetLayer.appendChild(n);
          setTimeout(() => n.remove(), duration);
        }

        function showDialog({
          title = "提示",
          message = "",
          withInput = false,
          defaultValue = "",
          placeholder = "",
          okText = "确定",
          cancelText = "取消",
          danger = false,
        }) {
          return new Promise((resolve) => {
            DialogLayer.classList.add("active");
            DialogLayer.innerHTML = `
              <div class="dialog-card">
                <div class="dialog-title">${title}</div>
                <div class="dialog-msg">${message}</div>
                ${
                  withInput
                    ? `<input class="dialog-input" id="dialogInput" value="${(defaultValue || "").replace(/"/g, "&quot;")}" placeholder="${(placeholder || "").replace(/"/g, "&quot;")}">`
                    : ""
                }
                <div class="dialog-actions">
                  <button class="dialog-btn cancel" id="dialogCancel">${cancelText}</button>
                  <button class="dialog-btn ok ${danger ? "danger" : ""}" id="dialogOk">${okText}</button>
                </div>
              </div>
            `;
            const input = document.getElementById("dialogInput");
            const close = (ok) => {
              const value = input ? input.value : "";
              DialogLayer.classList.remove("active");
              DialogLayer.innerHTML = "";
              resolve({ ok, value });
            };
            document.getElementById("dialogCancel").addEventListener("click", () => close(false));
            document.getElementById("dialogOk").addEventListener("click", () => close(true));
            DialogLayer.addEventListener(
              "click",
              (e) => {
                if (e.target === DialogLayer) close(false);
              },
              { once: true },
            );
            if (input) {
              input.focus();
              input.select();
              input.addEventListener("keydown", (e) => {
                if (e.key === "Enter") close(true);
                if (e.key === "Escape") close(false);
              });
            }
          });
        }

        async function askText(title, defaultValue, placeholder) {
          const r = await showDialog({
            title,
            message: "请输入名称",
            withInput: true,
            defaultValue,
            placeholder,
            okText: "确定",
            cancelText: "取消",
          });
          return r.ok ? r.value : null;
        }

        async function askConfirm(message, danger) {
          const r = await showDialog({
            title: "确认操作",
            message,
            okText: "确认",
            cancelText: "取消",
            danger: !!danger,
          });
          return r.ok;
        }

        const bubbles = [...document.querySelectorAll(".device-bubble")];
        const centerDevice = document.getElementById("centerDevice");
        const deviceStatus = document.getElementById("deviceStatus");
        let dragBubble = null;

        bubbles.forEach((bubble) => {
          bubble.dataset.initStyle = bubble.getAttribute("style") || "";
          bubble.addEventListener("pointerdown", (e) => {
            e.stopPropagation();
            const box = document
              .getElementById("superDevice")
              .getBoundingClientRect();
            const b = bubble.getBoundingClientRect();
            dragBubble = {
              el: bubble,
              offsetX: e.clientX - b.left,
              offsetY: e.clientY - b.top,
              box,
            };
            bubble.setPointerCapture(e.pointerId);
          });
          bubble.addEventListener("pointermove", (e) => {
            if (!dragBubble || dragBubble.el !== bubble) return;
            const x = e.clientX - dragBubble.box.left - dragBubble.offsetX;
            const y = e.clientY - dragBubble.box.top - dragBubble.offsetY;
            bubble.style.left = `${Math.max(0, Math.min(x, dragBubble.box.width - 84))}px`;
            bubble.style.top = `${Math.max(0, Math.min(y, dragBubble.box.height - 84))}px`;
            bubble.style.right = "auto";
            bubble.style.bottom = "auto";
          });
          bubble.addEventListener("pointerup", () => {
            if (!dragBubble || dragBubble.el !== bubble) return;
            const cb = centerDevice.getBoundingClientRect();
            const bb = bubble.getBoundingClientRect();
            const cx = cb.left + cb.width / 2;
            const cy = cb.top + cb.height / 2;
            const bx = bb.left + bb.width / 2;
            const by = bb.top + bb.height / 2;
            const d = Math.hypot(cx - bx, cy - by);

            if (d < 78) {
              bubble.classList.add("connected");
              bubble.style.left = `${centerDevice.offsetLeft + 5}px`;
              bubble.style.top = `${centerDevice.offsetTop + 5}px`;
              bubble.style.right = "auto";
              bubble.style.bottom = "auto";
              deviceStatus.textContent = `${bubble.dataset.device} 已连接，可进行多设备协同。`;
              showSheet(`${bubble.dataset.device} 已连接`);
            } else if (!bubble.classList.contains("connected")) {
              bubble.setAttribute("style", bubble.dataset.initStyle);
            }
            dragBubble = null;
          });
        });

        const widgetGesture = new Map();
        document
          .querySelectorAll(".app-icon-wrap[data-widget-target]")
          .forEach((wrap) => {
            const btn = wrap.querySelector(".app-icon");
            btn.addEventListener("pointerdown", (e) => {
              widgetGesture.set(btn, { y: e.clientY, t: Date.now() });
            });
            btn.addEventListener("pointerup", (e) => {
              const g = widgetGesture.get(btn);
              if (!g) return;
              const dy = e.clientY - g.y;
              const dt = Date.now() - g.t;
              if (dy < -36 && dt < 520) {
                const target = document.getElementById(
                  wrap.dataset.widgetTarget,
                );
                if (target) {
                  target.classList.add("visible");
                  wrap.style.display = "none";
                  showSheet("已上滑呼出服务卡片");
                }
              }
              widgetGesture.delete(btn);
            });
          });

        function addServiceWidget(name) {
          const grid = document.getElementById("desktopGrid");
          const node = document.createElement("div");
          node.className = "widget-steps card";
          node.innerHTML = `<div><div style="font-size:12px;color:#3c6387;">${name}服务</div><div style="font-size:20px;font-weight:700;color:#184166;">已添加</div></div><div class="steps-pill"></div>`;
          grid.appendChild(node);
          showSheet(`${name} 已添加到桌面`);
        }

        document.querySelectorAll("[data-add-service]").forEach((btn) => {
          btn.addEventListener("click", () =>
            addServiceWidget(btn.dataset.addService),
          );
        });

        const momentGrid = document.getElementById("momentGrid");
        const viewer = document.getElementById("photoViewer");
        const viewerImg = document.getElementById("viewerImg");
        const closeViewer = document.getElementById("closeViewer");
        let viewerScale = 1;
        let pinchStartDist = 0;
        let pinchBaseScale = 1;

        function renderGallery() {
          if (!state.galleryItems.length) {
            const seed = [
              { tag: "2月", cls: "big", src: "https://picsum.photos/id/1015/900/1200" },
              { tag: "昨日", cls: "wide", src: "https://picsum.photos/id/1025/1200/800" },
              { tag: "旅行", cls: "", src: "https://picsum.photos/id/1035/800/1000" },
              { tag: "运动", cls: "big", src: "https://picsum.photos/id/1043/900/1200" },
              { tag: "晚霞", cls: "", src: "https://picsum.photos/id/1067/800/1000" },
              { tag: "周末", cls: "wide", src: "https://picsum.photos/id/1074/1200/800" },
              { tag: "街景", cls: "", src: "https://picsum.photos/id/1084/800/1000" },
              { tag: "美食", cls: "", src: "https://picsum.photos/id/1080/800/1000" },
            ];
            state.galleryItems = seed.map((it, i) => ({
              id: `p-${i}`,
              tag: it.tag,
              cls: it.cls,
              src: it.src,
            }));
          }
          momentGrid.innerHTML = "";
          state.galleryItems.forEach((item, i) => {
            const div = document.createElement("div");
            div.className = `photo-tile ${item.cls || ""}`;
            div.style.backgroundImage = `url("${item.src}")`;
            div.innerHTML = `<div class="photo-tag">${item.tag}</div>`;
            div.addEventListener("click", () => openViewer(i));
            momentGrid.appendChild(div);
          });
        }

        function openViewer(index) {
          const item = state.galleryItems[index];
          viewerImg.style.backgroundImage = `url("${item.src}")`;
          viewer.classList.add("active");
          viewerScale = 1;
          viewerImg.style.transform = "scale(1)";
        }

        function setViewerScale(v) {
          viewerScale = Math.max(1, Math.min(v, 4));
          viewerImg.style.transform = `scale(${viewerScale})`;
        }

        closeViewer.addEventListener("click", () =>
          viewer.classList.remove("active"),
        );
        viewer.addEventListener("click", (e) => {
          if (e.target === viewer) viewer.classList.remove("active");
        });
        viewer.addEventListener("wheel", (e) => {
          e.preventDefault();
          setViewerScale(viewerScale + (e.deltaY < 0 ? 0.1 : -0.1));
        });
        viewer.addEventListener(
          "touchstart",
          (e) => {
            if (e.touches.length === 2) {
              const [a, b] = e.touches;
              pinchStartDist = Math.hypot(
                a.clientX - b.clientX,
                a.clientY - b.clientY,
              );
              pinchBaseScale = viewerScale;
            }
          },
          { passive: true },
        );
        viewer.addEventListener(
          "touchmove",
          (e) => {
            if (e.touches.length === 2 && pinchStartDist) {
              const [a, b] = e.touches;
              const d = Math.hypot(
                a.clientX - b.clientX,
                a.clientY - b.clientY,
              );
              setViewerScale(pinchBaseScale * (d / pinchStartDist));
            }
          },
          { passive: true },
        );
        viewer.addEventListener("touchend", () => {
          pinchStartDist = 0;
        });

        renderGallery();

        const dialPad = document.getElementById("dialPad");
        const dialInput = document.getElementById("dialInput");
        const callStatus = document.getElementById("callStatus");
        ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].forEach(
          (n) => {
            const b = document.createElement("button");
            b.className = "dial-key";
            b.textContent = n;
            b.addEventListener("click", () => {
              dialInput.value += n;
            });
            dialPad.appendChild(b);
          },
        );

        document.getElementById("callBtn").addEventListener("click", () => {
          if (!dialInput.value.trim()) {
            showSheet("请输入号码");
            return;
          }
          state.callActive = true;
          callStatus.textContent = `正在呼叫 ${dialInput.value}...`;
        });

        document.getElementById("hangBtn").addEventListener("click", () => {
          state.callActive = false;
          callStatus.textContent = "已挂断";
        });

        const meetimeStatus = document.getElementById("meetimeStatus");
        document.getElementById("meetimeCall").addEventListener("click", () => {
          state.meetimeActive = true;
          meetimeStatus.textContent = "通话中（加密已启用）";
        });
        document.getElementById("meetimeHang").addEventListener("click", () => {
          state.meetimeActive = false;
          meetimeStatus.textContent = "已结束通话";
        });

        const defaultFsRoot = {
          type: "folder",
          name: "我的文件",
          children: [
            {
              type: "folder",
              name: "下载",
              children: [{ type: "file", name: "指南.txt", content: "欢迎使用文件系统。" }],
            },
            {
              type: "folder",
              name: "文档",
              children: [{ type: "file", name: "项目计划.md", content: "# 项目计划\n\n- 目标\n- 里程碑\n" }],
            },
            { type: "file", name: "待办.txt", content: "1. 完成演示\n2. 联调功能\n" },
          ],
        };
        const filePath = document.getElementById("filePath");
        const fileList = document.getElementById("fileList");

        function sanitizeName(name, fallbackName) {
          if (name === null) return "";
          const s = (name || "").trim().replace(/[\\/:*?"<>|]/g, "_");
          return s || fallbackName;
        }

        function cloneDefaultFs() {
          return JSON.parse(JSON.stringify(defaultFsRoot));
        }

        function normalizeFsNode(node) {
          if (!node || typeof node !== "object") return null;
          if (node.type === "folder") {
            const folderName = sanitizeName(node.name, "未命名文件夹");
            const list = Array.isArray(node.children) ? node.children : [];
            const children = list.map((child) => normalizeFsNode(child)).filter(Boolean);
            return { type: "folder", name: folderName, children };
          }
          const fileName = sanitizeName(node.name, "未命名.txt");
          const content = typeof node.content === "string" ? node.content : "";
          return { type: "file", name: fileName, content };
        }

        let fsRoot = cloneDefaultFs();
        try {
          const rawFs = localStorage.getItem("webos.fsRoot");
          if (rawFs) {
            const parsed = normalizeFsNode(JSON.parse(rawFs));
            if (parsed && parsed.type === "folder") fsRoot = parsed;
          }
        } catch {}

        const fsPath = [fsRoot];
        const fsIndexPath = [];

        function saveFs() {
          localStorage.setItem("webos.fsRoot", JSON.stringify(fsRoot));
        }

        function currentFolder() {
          return fsPath[fsPath.length - 1];
        }

        function upsertFileInRoot(name, content) {
          const folder = fsRoot;
          const idx = folder.children.findIndex(
            (child) => child.type === "file" && child.name === name,
          );
          if (idx >= 0) {
            folder.children[idx].content = content;
            return idx;
          }
          folder.children.push({ type: "file", name, content });
          return folder.children.length - 1;
        }

        function getNodeByIndexPath(path) {
          let node = fsRoot;
          for (const idx of path) {
            if (!node || node.type !== "folder" || !node.children[idx]) return null;
            node = node.children[idx];
          }
          return node;
        }

        function loadFsFileIntoEditor(path, silent) {
          const fileNode = getNodeByIndexPath(path);
          if (!fileNode || fileNode.type !== "file") {
            state.editorBinding = null;
            if (!silent) showSheet("文件不存在或已被删除");
            return;
          }
          state.editorBinding = { path: [...path] };
          editorName.value = fileNode.name;
          editorContent.value = fileNode.content || "";
          editorStatus.textContent = "文件系统文件";
          if (!silent) openApp("editor");
        }

        function renderFiles() {
          filePath.textContent = "/" + fsPath.map((n) => n.name).join("/");
          fileList.innerHTML = "";
          const folder = currentFolder();
          if (!folder.children.length) {
            const e = document.createElement("div");
            e.className = "file-item";
            e.textContent = "空文件夹";
            fileList.appendChild(e);
            return;
          }
          folder.children.forEach((it, idx) => {
            const row = document.createElement("div");
            row.className = "file-item";

            const name = document.createElement("span");
            name.className = "file-name";
            name.textContent = `${it.type === "folder" ? "📁" : "📄"} ${it.name}`;
            name.addEventListener("click", () => {
              if (it.type === "folder") {
                fsPath.push(it);
                fsIndexPath.push(idx);
                renderFiles();
                return;
              }
              loadFsFileIntoEditor([...fsIndexPath, idx], false);
            });

            const del = document.createElement("button");
            del.className = "danger";
            del.textContent = "删除";
            del.addEventListener("click", async (e) => {
              e.stopPropagation();
              const ok = await askConfirm(`确认删除 ${it.name} ?`, true);
              if (!ok) return;
              folder.children.splice(idx, 1);
              saveFs();
              renderFiles();
            });

            row.appendChild(name);
            row.appendChild(del);
            fileList.appendChild(row);
          });
        }

        document.getElementById("newFolderBtn").addEventListener("click", async () => {
          const suggested = `新建文件夹${Math.floor(Math.random() * 90 + 10)}`;
          const input = await askText("新建文件夹", suggested, "输入文件夹名称");
          const name = sanitizeName(input, suggested);
          if (!name) return;
          currentFolder().children.push({
            type: "folder",
            name,
            children: [],
          });
          saveFs();
          renderFiles();
        });

        document.getElementById("newFileBtn").addEventListener("click", async () => {
          const suggested = `文件${Math.floor(Math.random() * 90 + 10)}.txt`;
          const input = await askText("新建文件", suggested, "输入文件名");
          const name = sanitizeName(input, suggested);
          if (!name) return;
          currentFolder().children.push({ type: "file", name, content: "" });
          saveFs();
          renderFiles();
        });

        document.getElementById("upFolderBtn").addEventListener("click", () => {
          if (fsPath.length > 1) {
            fsPath.pop();
            fsIndexPath.pop();
          }
          renderFiles();
        });

        saveFs();
        renderFiles();

        const urlInput = document.getElementById("urlInput");
        const webFrame = document.getElementById("webFrame");
        const browserStatus = document.getElementById("browserStatus");

        function normalizeWebInput(raw) {
          const s = (raw || "").trim();
          if (!s) return "";
          if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(s)) return s;
          if (s.startsWith("www.")) return `https://${s}`;
          if (/^[^/\s]+\.[^/\s]+/.test(s)) return `https://${s}`;
          return `https://www.baidu.com/s?wd=${encodeURIComponent(s)}`;
        }

        function openWebByInput(preferExternal, autoOpen = false) {
          const normalized = normalizeWebInput(urlInput.value);
          if (!normalized) {
            showSheet("请输入网址");
            return;
          }
          urlInput.value = normalized;

          webFrame.removeAttribute("srcdoc");
          webFrame.src = normalized;
          browserStatus.textContent = `正在打开: ${normalized}`;

          let forceExternal = false;
          try {
            const host = new URL(normalized).hostname.toLowerCase();
            forceExternal = host.endsWith("baidu.com") || host.includes("wikipedia.org");
          } catch {}

          // Many major websites deny iframe embedding; open a safe fallback tab.
          if ((preferExternal || forceExternal) && !autoOpen) {
            const win = window.open(normalized, "_blank", "noopener,noreferrer");
            if (win) {
              browserStatus.textContent = forceExternal
                ? "该站点可能限制嵌入，已自动在新标签打开"
                : "已在新标签打开该网页";
            } else {
              browserStatus.textContent = "站点可能限制嵌入，请允许弹窗后重试“新标签”";
            }
          } else {
            browserStatus.textContent = forceExternal
              ? "该站点可能限制嵌入，建议点击“新标签”完整打开"
              : "若页面空白，点“新标签”打开（部分网站禁止嵌入）";
          }
        }

        document.getElementById("openUrlBtn").addEventListener("click", () => {
          openWebByInput(false);
        });
        document
          .getElementById("openExternalBtn")
          .addEventListener("click", () => openWebByInput(true));
        urlInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") openWebByInput(false);
        });
        openWebByInput(false, true);

        const video = document.getElementById("cameraVideo");
        const canvas = document.getElementById("cameraCanvas");
        const cameraStatus = document.getElementById("cameraStatus");

        async function startCamera() {
          if (state.cameraStream) return;
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            cameraStatus.textContent = "当前浏览器不支持摄像头";
            return;
          }
          try {
            state.cameraStream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
            video.srcObject = state.cameraStream;
            cameraStatus.textContent = "摄像头已开启";
          } catch (err) {
            cameraStatus.textContent = "摄像头权限被拒绝";
          }
        }

        function stopCamera() {
          if (state.cameraStream) {
            state.cameraStream.getTracks().forEach((t) => t.stop());
            state.cameraStream = null;
            video.srcObject = null;
          }
        }

        document.getElementById("captureBtn").addEventListener("click", () => {
          const w = video.videoWidth || 720;
          const h = video.videoHeight || 1280;
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          ctx.drawImage(video, 0, 0, w, h);
          const data = canvas.toDataURL("image/jpeg", 0.85);
          state.galleryItems.unshift({
            id: `camera-${Date.now()}`,
            tag: "刚刚",
            cls: "big",
            src: data,
          });
          renderGallery();
          cameraStatus.textContent = "已拍照并保存到图库";
          showSheet("照片已保存");
        });

        const mails = [
          {
            id: "m1",
            title: "会议提醒",
            body: "今天 14:00 评审会，请提前准备演示稿。",
            type: "短信",
            from: "项目组",
            time: "今天 09:20",
          },
          {
            id: "m2",
            title: "周报提交",
            body: "请于今晚 20:00 前提交本周进展。",
            type: "邮件",
            from: "PMO <pmo@example.com>",
            time: "今天 10:06",
          },
          {
            id: "m3",
            title: "快递已签收",
            body: "您的快递已放入快递柜，取件码 7621。",
            type: "短信",
            from: "快递助手",
            time: "今天 12:14",
          },
          {
            id: "m4",
            title: "差旅审批通过",
            body: "您的差旅申请已通过，可在日程中查看。",
            type: "邮件",
            from: "HR 系统 <hr@example.com>",
            time: "昨天 18:32",
          },
        ];
        const mailList = document.getElementById("mailList");
        const mailDetail = document.getElementById("mailDetail");
        const mailFilterButtons = document.querySelectorAll("[data-mail-filter]");
        let currentMailFilter = "all";
        let activeMailId = "";

        function renderMailDetail(mail) {
          if (!mail) {
            mailDetail.innerHTML = "选择一条消息查看详情";
            return;
          }
          mailDetail.innerHTML = `
            <div style="font-size:16px;font-weight:700;color:#1a466f;margin-bottom:6px;">${mail.title}</div>
            <div class="sub" style="margin-bottom:8px;">${mail.type} · ${mail.from} · ${mail.time}</div>
            <div style="font-size:14px;line-height:1.6;color:#315b82;">${mail.body}</div>
          `;
        }

        function renderMails() {
          const filtered = currentMailFilter === "all"
            ? mails
            : mails.filter((m) => m.type === currentMailFilter);
          mailList.innerHTML = "";
          filtered.forEach((m) => {
            const item = document.createElement("div");
            item.className = "mail-item";
            item.innerHTML = `<div style="font-weight:650;">${m.title}</div><div class="sub">${m.type} · ${m.time}</div>`;
            if (m.id === activeMailId) item.classList.add("active");
            item.addEventListener("click", () => {
              [...mailList.children].forEach((c) =>
                c.classList.remove("active"),
              );
              item.classList.add("active");
              activeMailId = m.id;
              renderMailDetail(m);
            });
            mailList.appendChild(item);
          });
          const selected = filtered.find((m) => m.id === activeMailId) || filtered[0];
          if (selected) {
            activeMailId = selected.id;
            renderMailDetail(selected);
            [...mailList.children].forEach((node, idx) => {
              if (filtered[idx] && filtered[idx].id === activeMailId) {
                node.classList.add("active");
              }
            });
          } else {
            renderMailDetail(null);
          }
        }

        mailFilterButtons.forEach((btn) => {
          btn.addEventListener("click", () => {
            mailFilterButtons.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            currentMailFilter = btn.dataset.mailFilter;
            renderMails();
          });
        });

        renderMails();

        const calcDisplay = document.getElementById("calcDisplay");
        const calcGrid = document.getElementById("calcGrid");
        const calcKeys = [
          "C",
          "(",
          ")",
          "÷",
          "7",
          "8",
          "9",
          "×",
          "4",
          "5",
          "6",
          "-",
          "1",
          "2",
          "3",
          "+",
          "0",
          ".",
          "=",
          "%",
        ];

        function updateCalc() {
          calcDisplay.value = state.calcExpr || "0";
        }

        calcKeys.forEach((k) => {
          const b = document.createElement("button");
          b.className = "calc-key";
          if ("÷×-+%=".includes(k)) b.classList.add("op");
          b.textContent = k;
          b.addEventListener("click", () => {
            if (k === "C") {
              state.calcExpr = "";
            } else if (k === "=") {
              try {
                const expr = state.calcExpr
                  .replace(/×/g, "*")
                  .replace(/÷/g, "/");
                if (!/^[0-9+\-*/().%\s]+$/.test(expr)) throw new Error("bad");
                state.calcExpr = String(
                  Function(`"use strict";return (${expr})`)(),
                );
              } catch {
                state.calcExpr = "错误";
                setTimeout(() => {
                  state.calcExpr = "";
                  updateCalc();
                }, 700);
              }
            } else {
              state.calcExpr += k;
            }
            updateCalc();
          });
          calcGrid.appendChild(b);
        });
        updateCalc();

        const editorName = document.getElementById("editorName");
        const editorContent = document.getElementById("editorContent");
        const editorStatus = document.getElementById("editorStatus");

        function loadEditor() {
          if (state.editorBinding && state.editorBinding.path) {
            loadFsFileIntoEditor(state.editorBinding.path, true);
            return;
          }
          const n = localStorage.getItem("editor.name") || "note.txt";
          const c = localStorage.getItem("editor.content") || "";
          editorName.value = n;
          editorContent.value = c;
          editorStatus.textContent = "";
        }

        document
          .getElementById("saveEditorBtn")
          .addEventListener("click", () => {
            const finalName = sanitizeName(editorName.value, "note.txt");
            if (!finalName) return;
            editorName.value = finalName;

            if (state.editorBinding && state.editorBinding.path) {
              const fileNode = getNodeByIndexPath(state.editorBinding.path);
              if (fileNode && fileNode.type === "file") {
                fileNode.name = finalName;
                fileNode.content = editorContent.value;
                saveFs();
                renderFiles();
                editorStatus.textContent = "已保存到文件系统";
                setTimeout(() => (editorStatus.textContent = ""), 1200);
                return;
              }
              state.editorBinding = null;
            }

            localStorage.setItem("editor.name", finalName);
            localStorage.setItem("editor.content", editorContent.value);
            const fileIndex = upsertFileInRoot(finalName, editorContent.value);
            state.editorBinding = { path: [fileIndex] };
            saveFs();
            renderFiles();
            editorStatus.textContent = "已保存到文件系统 /我的文件";
            setTimeout(() => (editorStatus.textContent = ""), 1200);
          });
        loadEditor();

        function insertTextAtCursor(el, text) {
          const start = el.selectionStart ?? el.value.length;
          const end = el.selectionEnd ?? el.value.length;
          const old = el.value;
          el.value = old.slice(0, start) + text + old.slice(end);
          const p = start + text.length;
          el.setSelectionRange(p, p);
          el.dispatchEvent(new Event("input", { bubbles: true }));
        }

        function backspaceAtCursor(el) {
          const start = el.selectionStart ?? el.value.length;
          const end = el.selectionEnd ?? el.value.length;
          if (start === end && start > 0) {
            el.value = el.value.slice(0, start - 1) + el.value.slice(end);
            el.setSelectionRange(start - 1, start - 1);
          } else {
            el.value = el.value.slice(0, start) + el.value.slice(end);
            el.setSelectionRange(start, start);
          }
          el.dispatchEvent(new Event("input", { bubbles: true }));
        }

        function showKeyboard(input) {
          state.focusedInput = input;
          Keyboard.classList.add("active");
        }

        function hideKeyboard() {
          Keyboard.classList.remove("active");
        }

        function buildKeyboard() {
          const rows = [
            ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
            ["a", "s", "d", "f", "g", "h", "j", "k", "l", "⌫"],
            ["z", "x", "c", "v", "b", "n", "m", "，", "。", "↵"],
            ["123", "空格", "收起"],
          ];
          Keyboard.innerHTML = "";
          rows.forEach((row, idx) => {
            const line = document.createElement("div");
            line.className = "key-row";
            if (idx === 3)
              line.style.gridTemplateColumns = "repeat(7, minmax(0, 1fr))";
            row.forEach((k) => {
              const key = document.createElement("button");
              key.className = "key";
              key.textContent = k;
              if (k === "123" || k === "收起" || k === "⌫" || k === "↵")
                key.classList.add("control");
              if (k === "空格") key.classList.add("space");
              key.addEventListener("mousedown", (e) => e.preventDefault());
              key.addEventListener("click", () => {
                const input = state.focusedInput;
                if (!input) return;
                input.focus();
                if (k === "⌫") backspaceAtCursor(input);
                else if (k === "↵") insertTextAtCursor(input, "\n");
                else if (k === "空格") insertTextAtCursor(input, " ");
                else if (k === "收起") hideKeyboard();
                else if (k === "123") showSheet("数字键盘示意");
                else insertTextAtCursor(input, k);
              });
              line.appendChild(key);
            });
            Keyboard.appendChild(line);
          });
        }
        buildKeyboard();

        document.querySelectorAll(".needs-keyboard").forEach((input) => {
          input.addEventListener("focus", () => showKeyboard(input));
          input.addEventListener("click", () => showKeyboard(input));
        });

        document.addEventListener("click", (e) => {
          if (
            !e.target.closest(".needs-keyboard") &&
            !e.target.closest("#Keyboard")
          )
            hideKeyboard();
        });

        setTimeout(() => {
          if (!state.locked) showSheet("电量较低，建议开启省电模式");
        }, 28000);

        hideLayer(HomeScreen);
        hideLayer(AppContainer);
        closeOverlays();
        showLayer(LockScreen);
      })();
    
