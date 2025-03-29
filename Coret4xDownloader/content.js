"use strict";

// Gunakan Symbol global untuk mencegah injeksi duplikat
if (!window[Symbol.for("__docDownloaderInjected")]) {
  window[Symbol.for("__docDownloaderInjected")] = true;

  class DocumentDownloader {
    constructor() {
      try {
        this.initMessageListener();
        this.createDownloadControl();
        console.info("[DocDownloader] Initialization complete.");
      } catch (error) {
        console.error("[DocDownloader] Error during initialization:", error);
      }
    }

    // Inisialisasi listener untuk pesan dari background script
    initMessageListener() {
      chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg?.action === "startDownloadDocuments") {
          console.info("[DocDownloader] Received command: startDownloadDocuments.");
          this.logFirstRowCells();
          this.beginDownload();
          sendResponse({ status: "Download process initiated" });
        }
      });
    }

    // Menghasilkan key unik untuk setiap baris berdasarkan teks dari sel-selnya
    createUniqueKey(row) {
      try {
        const key = Array.from(row.cells)
          .map(cell => cell.innerText.trim().replace(/\s+/g, " "))
          .join(" | ");
        console.debug(`[DocDownloader] Generated key for row: ${key}`);
        return key;
      } catch (error) {
        console.error("[DocDownloader] Error generating key for row:", error);
        return "";
      }
    }

    // Mencatat isi beberapa sel dari baris pertama (untuk debugging)
    logFirstRowCells() {
      try {
        const rows = document.querySelectorAll("table tbody tr");
        console.info(`[DocDownloader] Total rows in table: ${rows.length}`);
        if (!rows.length) {
          console.warn("[DocDownloader] No rows found in the table.");
          return;
        }
        const sample = rows[0];
        console.info("[DocDownloader] Contents of the first row:");
        const maxCells = Math.min(10, sample.children.length);
        for (let i = 0; i < maxCells; i++) {
          console.info(`  Cell[${i}]: ${sample.children[i].innerText.trim()}`);
        }
      } catch (error) {
        console.error("[DocDownloader] Error logging first row cells:", error);
      }
    }

    // Membuat tombol download dan overlay instruksi yang dipersonalisasi sesuai halaman
    createDownloadControl() {
      try {
        if (document.getElementById("doc-download-btn")) return;

        // Buat tombol download dengan styling modern
        const btn = document.createElement("button");
        btn.id = "doc-download-btn";
        btn.textContent = "Download Dokumen";
        Object.assign(btn.style, {
          position: "fixed",
          bottom: "20px",
          left: "20px",
          padding: "12px 18px",
          fontSize: "16px",
          backgroundColor: "#28a745",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          zIndex: "10000"
        });
        btn.addEventListener("click", () => this.beginDownload());
        document.body.appendChild(btn);
        console.info("[DocDownloader] Download button added.");

        // Personalisasikan instruksi sesuai halaman aktif
        const currentUrl = window.location.href;
        let instructions = "";
        if (currentUrl.includes("returnsheets-portal")) {
          instructions = "Di halaman Returnsheets, tidak ada opsi untuk memilih baris. " +
            "Semua dokumen yang terdaftar akan diunduh. Pastikan data sudah benar, lalu klik tombol 'Download Dokumen' untuk memulai unduhan.";
        } else if (currentUrl.includes("e-invoice-portal")) {
          instructions = "Di halaman e-Faktur, silahkan centang baris yang ingin Anda unduh, " +
            "kemudian klik tombol 'Download Dokumen'. Baris yang gagal akan ditandai dengan warna merah.";
        } else if (currentUrl.includes("withholding-slips-portal")) {
          instructions = "Di halaman Bukti Potong, centang dokumen yang ingin Anda unduh, " +
            "lalu klik tombol 'Download Dokumen'. Baris yang tidak berhasil diunduh akan ditandai dengan warna merah.";
        } else {
          instructions = "Silahkan pilih baris yang ingin diunduh (jika tersedia), " +
            "kemudian klik tombol 'Download Dokumen'. Baris yang gagal akan ditandai dengan warna merah.";
        }
        instructions += "\n\nCatatan: Unduhan dilakukan secara lokal tanpa mengirim data ke server.";

        const extraButtons = [
          {
            text: "Lanjutkan Download",
            style: { backgroundColor: "#28a745" },
            handler: overlay => {
              console.info("[DocDownloader] User chose to proceed with download.");
              document.body.removeChild(overlay);
            }
          },
          {
            text: "Batal Download",
            style: { backgroundColor: "#dc3545" },
            handler: overlay => {
              console.info("[DocDownloader] User cancelled download. Hiding download button.");
              const downloadBtn = document.getElementById("doc-download-btn");
              if (downloadBtn) {
                downloadBtn.style.display = "none";
              }
              document.body.removeChild(overlay);
            }
          }
        ];
        this.showModal(instructions, "Instruksi Penggunaan", extraButtons);
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
            console.info(`[DocDownloader] Extra button '${btnData.text}' clicked.`);
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
      console.info(`[DocDownloader] Verifying download URL: ${url}`);
      try {
        const response = await fetch(url, {
          method: "HEAD",
          credentials: "include",
          cache: "no-cache"
        });
        if (response.ok) {
          console.info(`[DocDownloader] URL verified successfully (status: ${response.status}).`);
          return true;
        } else {
          console.warn(`[DocDownloader] URL check returned status ${response.status}.`);
          return false;
        }
      } catch (error) {
        console.error(`[DocDownloader] Error verifying URL ${url}:`, error);
        return false;
      }
    }

    // Menunggu hingga baris dengan key tertentu muncul (untuk mendukung konten dinamis)
    waitForRow(key, timeout) {
      return new Promise((resolve, reject) => {
        console.info(`[DocDownloader] Waiting for row with key: ${key}`);
        const interval = 1000;
        let elapsed = 0;
        const timer = setInterval(() => {
          const found = this.findRowByKey(key);
          if (found) {
            console.info(`[DocDownloader] Row found for key: ${key}`);
            clearInterval(timer);
            resolve(found);
          }
          elapsed += interval;
          if (elapsed >= timeout) {
            console.error(`[DocDownloader] Timeout after ${timeout}ms: Row with key "${key}" not found.`);
            clearInterval(timer);
            reject(new Error("Timeout: Row not found"));
          }
        }, interval);
      });
    }

    // Mencari baris berdasarkan key unik
    findRowByKey(key) {
      const rows = document.querySelectorAll("table.p-datatable-table tbody tr");
      const foundRow = Array.from(rows).find(row => this.createUniqueKey(row) === key);
      if (!foundRow) {
        console.debug(`[DocDownloader] No row found with key: ${key}`);
      }
      return foundRow;
    }

    // Tandai baris dengan border merah bila terjadi error
    highlightRow(row) {
      if (row) {
        row.style.border = "2px solid red";
        console.info(`[DocDownloader] Marked row as failed: ${this.createUniqueKey(row)}`);
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
        console.info("[DocDownloader] Closing download summary.");
        document.body.removeChild(overlay);
      });
      modal.appendChild(closeBtn);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      console.info(`[DocDownloader] Download summary: ${successCount} succeeded, ${failedList.length} failed.`);
    }

    // Membuat tabel responsif untuk menampilkan detail dokumen yang gagal diunduh
    createFailedDocsTable(failedList) {
      // Pisahkan key menjadi array data, jangan filter item kosong untuk menjaga struktur
      const dataRows = failedList.map(key =>
        key.split("|").map(item => item.trim())
      );

      // Dapatkan sample row untuk mengetahui jumlah kolom sebenarnya
      const sampleRow = document.querySelector("table.p-datatable-table tbody tr");
      const colCount = sampleRow ? sampleRow.cells.length : 0;

      // Ambil header asli dari tabel utama, termasuk header kosong agar strukturnya sama
      let headers = [];
      const originalHeader = document.querySelector("table.p-datatable-table thead tr");
      if (originalHeader) {
        headers = Array.from(originalHeader.children).map(th => th.innerText.trim());
      }

      // Tentukan jumlah kolom maksimum berdasarkan data, header, atau sample row count
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
        // Gunakan label header asli jika ada, walaupun kosong
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

      // Buat tbody dengan data error, lengkapi sel kosong agar strukturnya sama
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

    // Fungsi utama: Kumpulkan baris yang dipilih (atau semua baris di Returnsheets) dan proses unduhan.
    async beginDownload() {
      console.info("[DocDownloader] Starting document download process...");
      const docSet = new Set();
      const isReturnsheets = window.location.href.includes("returnsheets-portal");
      const rows = document.querySelectorAll("table.p-datatable-table tbody tr");
      console.info(`[DocDownloader] Found ${rows.length} rows in the table.`);
      
      rows.forEach(row => {
        const chk = row.querySelector("input[type='checkbox']");
        if (chk) {
          console.debug("[DocDownloader] Checkbox detected. Checked:", chk.checked);
          if (chk.checked) {
            const key = this.createUniqueKey(row);
            if (key) docSet.add(key);
          }
        } else if (isReturnsheets) {
          console.debug("[DocDownloader] No checkbox found; assuming row is selected (Returnsheets Portal).");
          const key = this.createUniqueKey(row);
          if (key) docSet.add(key);
        }
      });
      
      const docList = Array.from(docSet);
      console.info(`[DocDownloader] Total unique documents to process: ${docList.length}`);
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
          console.info("[DocDownloader] Download process complete.");
          this.showSummary(successCount, failedDocs);
          return;
        }
        const currentDocKey = docList[idx];
        console.info(`[DocDownloader] Processing document ${idx + 1}: ${currentDocKey}`);
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
                console.warn(`[DocDownloader] Download URL check failed for: ${downloadUrl}`);
                this.highlightRow(rowEl);
                failedDocs.push(currentDocKey);
                idx++;
                return setTimeout(processNext, 2500);
              }
            } else {
              console.debug("[DocDownloader] No download URL found; proceeding with button click.");
            }
            console.info(`[DocDownloader] Initiating download for: ${buyer} - ${currentDocKey} (${date})`);
            btnDownload.click();
            successCount++;
          } else {
            console.warn(`[DocDownloader] Download button not found for: ${currentDocKey}`);
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