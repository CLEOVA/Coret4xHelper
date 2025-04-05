"use strict";

// Gunakan Symbol global untuk mencegah injeksi duplikat
if (!window[Symbol.for("__docDownloaderInjected")]) {
  window[Symbol.for("__docDownloaderInjected")] = true;

  class DocumentDownloader {
    constructor() {
      try {
        this.initMessageListener();
        this.createDownloadControl();
      } catch (error) {
        console.error("[DocDownloader] Error during initialization:", error);
      }
    }

// Inisialisasi listener untuk pesan dari background script
initMessageListener() {
  chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
    try {
      // Opsional: Pastikan pesan berasal dari extension kamu sendiri
      if (sender && sender.id !== chrome.runtime.id) {
        return;
      }

      if (msg?.action === "startDownloadDocuments") {
        // Misalnya, jika beginDownload() mengembalikan Promise
        await this.beginDownload();
        sendResponse({ status: "Download process initiated" });
      }
    } catch (error) {
      console.error("[DocDownloader] Error in message listener:", error);
      sendResponse({ status: "Error", error: error.toString() });
    }
    // Return true untuk mengindikasikan respon secara asynchronous
    return true;
  });
}


    // Menghasilkan key unik untuk setiap baris berdasarkan teks dari sel-selnya
    createUniqueKey(row) {
      try {
        const key = Array.from(row.cells)
          .map(cell => cell.innerText.trim().replace(/\s+/g, " "))
          .join(" | ");
        return key;
      } catch (error) {
        console.error("[DocDownloader] Error generating key for row:", error);
        return "";
      }
    }
    // Membuat tombol download dengan container dan tombol close di pojok kanan atas
    createDownloadControl() {
      try {
        if (document.getElementById("doc-download-wrapper")) return;

        const wrapper = document.createElement("div");
        wrapper.id = "doc-download-wrapper";
        Object.assign(wrapper.style, {
          position: "fixed",
          bottom: "20px",
          left: "20px",
          zIndex: "10000",
        });

        const btn = document.createElement("button");
        btn.id = "doc-download-btn";
        btn.textContent = "Download Dokumen";
        Object.assign(btn.style, {
          padding: "12px 18px",
          fontSize: "16px",
          backgroundColor: "#28a745",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        });
        btn.addEventListener("click", () => this.beginDownload());
        wrapper.appendChild(btn);

        const closeIcon = document.createElement("span");
        closeIcon.innerHTML = "&times;";
        Object.assign(closeIcon.style, {
          position: "absolute",
          top: "-10px",
          right: "-10px",
          backgroundColor: "#dc3545",
          color: "white",
          borderRadius: "50%",
          width: "20px",
          height: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "14px",
          cursor: "pointer",
          lineHeight: "20px",
        });
        closeIcon.addEventListener("click", () => {
          wrapper.style.display = "none";
        });
        wrapper.appendChild(closeIcon);

        document.body.appendChild(wrapper);
      } catch (error) {
        console.error("[DocDownloader] Error creating download control:", error);
      }
    }

    // Menampilkan modal overlay dengan pesan dan tombol aksi
    showModal(message, title = "Informasi", extraButtons = []) {
      try {
        const overlay = document.createElement("div");
        Object.assign(overlay.style, {
          position: "fixed",
          top: "0",
          left: "0",
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: "9999"
        });
        const modal = document.createElement("div");
        Object.assign(modal.style, {
          backgroundColor: "#fff",
          padding: "20px",
          borderRadius: "8px",
          maxWidth: "600px",
          width: "90%",
          textAlign: "center",
          boxShadow: "0 4px 8px rgba(0,0,0,0.2)"
        });
        const modalTitle = document.createElement("h2");
        modalTitle.textContent = title;
        modalTitle.style.marginTop = "0";
        modal.appendChild(modalTitle);
        const modalMessage = document.createElement("p");
        modalMessage.textContent = message;
        modalMessage.style.fontSize = "16px";
        modalMessage.style.whiteSpace = "normal";
        modal.appendChild(modalMessage);
        extraButtons.forEach(btnData => {
          const extraBtn = document.createElement("button");
          extraBtn.textContent = btnData.text;
          Object.assign(extraBtn.style, {
            display: "block",
            width: "100%",
            margin: "5px 0",
            padding: "10px",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            backgroundColor: btnData.style?.backgroundColor || "#28a745"
          });
          extraBtn.addEventListener("click", () => {
            btnData.handler(overlay);
          });
          modal.appendChild(extraBtn);
        });
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        return overlay;
      } catch (error) {
        console.error("[DocDownloader] Error displaying modal:", error);
      }
    }

    // Memeriksa status URL download menggunakan fetch HEAD (jika URL tersedia)
    async checkDownload(url) {
      try {
        const response = await fetch(url, {
          method: "HEAD",
          credentials: "include",
          cache: "no-cache"
        });
        return response.ok;
      } catch (error) {
        console.error(`[DocDownloader] Error verifying URL ${url}:`, error);
        return false;
      }
    }

// Menunggu hingga baris dengan key tertentu muncul menggunakan MutationObserver
waitForRow(key, timeout) {
  return new Promise((resolve, reject) => {
    // Cek awal apakah row sudah ada
    const found = this.findRowByKey(key);
    if (found) {
      return resolve(found);
    }

    const observer = new MutationObserver((mutations, obs) => {
      const found = this.findRowByKey(key);
      if (found) {
        obs.disconnect();
        resolve(found);
      }
    });

    // Mengamati perubahan di seluruh document body
    observer.observe(document.body, { childList: true, subtree: true });

    // Timeout jika elemen tidak ditemukan dalam waktu yang ditentukan
    setTimeout(() => {
      observer.disconnect();
      console.error(`[DocDownloader] Timeout after ${timeout}ms: Row dengan key "${key}" tidak ditemukan.`);
      reject(new Error("Timeout: Row not found"));
    }, timeout);
  });
}

    // Mencari baris berdasarkan key unik
    findRowByKey(key) {
      const rows = document.querySelectorAll("table.p-datatable-table tbody tr");
      return Array.from(rows).find(row => this.createUniqueKey(row) === key);
    }

    // Tandai baris dengan border merah bila terjadi error
    highlightRow(row) {
      if (row) {
        row.style.border = "2px solid red";
      }
    }

    // Tampilkan ringkasan proses unduhan secara user-friendly
    showSummary(successCount, failedList) {
      const overlay = document.createElement("div");
      Object.assign(overlay.style, {
        position: "fixed",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: "9999"
      });
      const modal = document.createElement("div");
      Object.assign(modal.style, {
        backgroundColor: "#fff",
        padding: "20px",
        borderRadius: "8px",
        maxWidth: "600px",
        width: "90%",
        textAlign: "center",
        boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
        maxHeight: "80vh",
        overflowY: "auto"
      });
      const modalTitle = document.createElement("h2");
      modalTitle.textContent = "Ringkasan Proses Unduhan";
      modalTitle.style.marginTop = "0";
      modal.appendChild(modalTitle);
      const summaryText = document.createElement("p");
      summaryText.textContent = `Berhasil: ${successCount} dokumen diunduh.`;
      summaryText.style.fontSize = "16px";
      modal.appendChild(summaryText);
      if (failedList.length > 0) {
        const failedText = document.createElement("p");
        failedText.textContent = `Gagal: ${failedList.length} dokumen. Berikut detailnya:`;
        failedText.style.fontSize = "16px";
        modal.appendChild(failedText);
        const tableDiv = this.createFailedDocsTable(failedList);
        modal.appendChild(tableDiv);
      }
      const closeBtn = document.createElement("button");
      closeBtn.textContent = "Tutup";
      Object.assign(closeBtn.style, {
        marginTop: "15px",
        padding: "10px 15px",
        backgroundColor: "#28a745",
        color: "white",
        border: "none",
        borderRadius: "5px",
        cursor: "pointer"
      });
      closeBtn.addEventListener("click", () => {
        document.body.removeChild(overlay);
      });
      modal.appendChild(closeBtn);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
    }

    // Membuat tabel responsif untuk menampilkan detail dokumen yang gagal diunduh
    createFailedDocsTable(failedList) {
      const dataRows = failedList.map(key =>
        key.split("|").map(item => item.trim())
      );
      const sampleRow = document.querySelector("table.p-datatable-table tbody tr");
      const colCount = sampleRow ? sampleRow.cells.length : 0;
      let headers = [];
      const originalHeader = document.querySelector("table.p-datatable-table thead tr");
      if (originalHeader) {
        headers = Array.from(originalHeader.children).map(th => th.innerText.trim());
      }
      const maxCols = Math.max(
        ...dataRows.map(arr => arr.length),
        headers.length,
        colCount
      );
      const table = document.createElement("table");
      Object.assign(table.style, {
        width: "100%",
        borderCollapse: "collapse",
        marginTop: "15px"
      });
      const thead = document.createElement("thead");
      const headerRow = document.createElement("tr");
      for (let i = 0; i < maxCols; i++) {
        const th = document.createElement("th");
        th.textContent = headers[i] !== undefined ? headers[i] : "";
        Object.assign(th.style, {
          border: "1px solid #ddd",
          padding: "8px",
          backgroundColor: "#f2f2f2",
          textAlign: "left"
        });
        headerRow.appendChild(th);
      }
      thead.appendChild(headerRow);
      table.appendChild(thead);
      const tbody = document.createElement("tbody");
      dataRows.forEach(rowData => {
        const tr = document.createElement("tr");
        for (let i = 0; i < maxCols; i++) {
          const td = document.createElement("td");
          td.textContent = rowData[i] !== undefined ? rowData[i] : "";
          Object.assign(td.style, {
            border: "1px solid #ddd",
            padding: "8px"
          });
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      const responsiveDiv = document.createElement("div");
      Object.assign(responsiveDiv.style, {
        overflowX: "auto",
        maxHeight: "50vh",
        overflowY: "auto"
      });
      responsiveDiv.appendChild(table);
      return responsiveDiv;
    }

    // Fungsi utama: Kumpulkan baris yang dipilih dan proses unduhan.
    async beginDownload() {
      const docSet = new Set();
      const isReturnsheets = window.location.href.includes("returnsheets-portal");
      const rows = document.querySelectorAll("table.p-datatable-table tbody tr");
      
      rows.forEach(row => {
        const chk = row.querySelector("input[type='checkbox']");
        if (chk) {
          if (chk.checked) {
            const key = this.createUniqueKey(row);
            if (key) docSet.add(key);
          }
        } else if (isReturnsheets) {
          const key = this.createUniqueKey(row);
          if (key) docSet.add(key);
        }
      });
      
      const docList = Array.from(docSet);
      if (!docList.length) {
        this.showModal("Harap pilih data terlebih dahulu sebelum mengunduh.", "Peringatan", [
          {
            text: "Tutup",
            style: { backgroundColor: "#28a745" },
            handler: overlay => document.body.removeChild(overlay)
          }
        ]);
        return;
      }
      
      let successCount = 0;
      const failedDocs = [];
      let idx = 0;
      const processNext = async () => {
        if (idx >= docList.length) {
          this.showSummary(successCount, failedDocs);
          return;
        }
        const currentDocKey = docList[idx];
        try {
          const rowEl = await this.waitForRow(currentDocKey, 5000);
          const buyer = rowEl.children[3] ? rowEl.children[3].innerText.trim() : "Unknown Buyer";
          const date = rowEl.children[6] ? rowEl.children[6].innerText.trim() : "Unknown Date";
          let btnDownload = rowEl.querySelector("button#DownloadButton");
          if (!btnDownload) {
            btnDownload = Array.from(rowEl.querySelectorAll("button")).find(btn =>
              /unduh|download/i.test(btn.innerText)
            );
          }
          if (btnDownload) {
            let downloadUrl = btnDownload.getAttribute("data-url") || btnDownload.href;
            if (downloadUrl) {
              const valid = await this.checkDownload(downloadUrl);
              if (!valid) {
                this.highlightRow(rowEl);
                failedDocs.push(currentDocKey);
                idx++;
                return setTimeout(processNext, 3000);
              }
            }
            btnDownload.click();
            successCount++;
          } else {
            this.highlightRow(rowEl);
            failedDocs.push(currentDocKey);
          }
        } catch (err) {
          console.error(`[DocDownloader] Error processing document ${currentDocKey}:`, err);
          failedDocs.push(currentDocKey);
        }
        idx++;
        setTimeout(processNext, 3000);
      };
      processNext();
    }
  }

  new DocumentDownloader();
}
