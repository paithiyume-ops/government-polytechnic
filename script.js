/**
 * GOVERNMENT POLYTECHNIC COLLEGE, PERUNDURAI
 * Student Payment Registration Portal - Frontend Logic
 * Pure Vanilla JavaScript (ES6+)
 */

// ==========================================================================
// 1. CONFIGURATION
// ==========================================================================
// Paste your deployed Google Apps Script Web App URL below:
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyM9164KWfHeGGGUZ_ITv63DXeL21BRdA7MdfAC0Mth7gdIxk6CPAHV6PieX0v7kcv_/exec";

// Validation Constants
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "pdf"];
const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

// ==========================================================================
// 2. STATE MANAGEMENT
// ==========================================================================
const appState = {
  selectedFile: null,
  fileBase64: null,
  fileMimeType: null,
  fileName: null,
  fileSizeBytes: 0,
  isSubmitting: false,
  activeStep: 1
};

// ==========================================================================
// 3. DOM ELEMENT REFERENCES
// ==========================================================================
const elements = {
  // Navigation & Progress
  progressSteps: document.querySelectorAll(".progress-step"),
  
  // Alert Banner
  globalAlert: document.getElementById("globalAlert"),
  globalAlertMessage: document.getElementById("globalAlertMessage"),
  btnDismissAlert: document.getElementById("btnDismissAlert"),

  // Form & Cards
  paymentForm: document.getElementById("paymentForm"),
  studentCard: document.getElementById("studentCard"),
  paymentCard: document.getElementById("paymentCard"),
  proofCard: document.getElementById("proofCard"),

  // Student Fields
  studentName: document.getElementById("studentName"),
  studentMobile: document.getElementById("studentMobile"),
  registerNumber: document.getElementById("registerNumber"),
  department: document.getElementById("department"),
  year: document.getElementById("year"),
  section: document.getElementById("section"),

  // Student Error Labels
  studentNameError: document.getElementById("studentNameError"),
  studentMobileError: document.getElementById("studentMobileError"),
  registerNumberError: document.getElementById("registerNumberError"),
  departmentError: document.getElementById("departmentError"),
  yearError: document.getElementById("yearError"),
  sectionError: document.getElementById("sectionError"),

  // Payment Fields
  transactionNumber: document.getElementById("transactionNumber"),
  amount: document.getElementById("amount"),
  academicYear: document.getElementById("academicYear"),

  // Payment Error Labels
  transactionNumberError: document.getElementById("transactionNumberError"),
  amountError: document.getElementById("amountError"),
  academicYearError: document.getElementById("academicYearError"),

  // File Upload Elements
  uploadDropzone: document.getElementById("uploadDropzone"),
  fileInput: document.getElementById("fileInput"),
  uploadIdleState: document.getElementById("uploadIdleState"),
  selectedFileDisplay: document.getElementById("selectedFileDisplay"),
  filePreviewSlot: document.getElementById("filePreviewSlot"),
  fileDisplayName: document.getElementById("fileDisplayName"),
  fileTypeBadge: document.getElementById("fileTypeBadge"),
  fileDisplaySize: document.getElementById("fileDisplaySize"),
  fileStatePill: document.getElementById("fileStatePill"),
  btnChangeFile: document.getElementById("btnChangeFile"),
  btnRemoveFile: document.getElementById("btnRemoveFile"),
  paymentProofError: document.getElementById("paymentProofError"),

  // Submission Controls
  btnSubmit: document.getElementById("btnSubmit"),
  btnSubmitLabel: document.getElementById("btnSubmitLabel"),
  submissionProgressBox: document.getElementById("submissionProgressBox"),
  submissionStatusLabel: document.getElementById("submissionStatusLabel"),

  // Success Screen Elements
  successScreen: document.getElementById("successScreen"),
  sumStudentName: document.getElementById("sumStudentName"),
  sumRegisterNumber: document.getElementById("sumRegisterNumber"),
  sumDeptYear: document.getElementById("sumDeptYear"),
  sumTransactionNumber: document.getElementById("sumTransactionNumber"),
  sumAmount: document.getElementById("sumAmount"),
  sumAcademicYear: document.getElementById("sumAcademicYear"),
  linkViewReceipt: document.getElementById("linkViewReceipt"),
  btnAnotherResponse: document.getElementById("btnAnotherResponse"),
  
  // Footer
  copyrightYear: document.getElementById("copyrightYear")
};

// ==========================================================================
// 4. INITIALIZATION & EVENT BINDINGS
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  // Set dynamic copyright year
  if (elements.copyrightYear) {
    elements.copyrightYear.textContent = new Date().getFullYear();
  }

  setupEventListeners();
  updateProgressUI(1);
});

function setupEventListeners() {
  // Alert dismiss
  elements.btnDismissAlert.addEventListener("click", hideGlobalAlert);

  // Field Input & Blur Listeners for Live Validation
  elements.studentName.addEventListener("input", () => validateField(elements.studentName, validateName));
  elements.studentMobile.addEventListener("input", handleMobileInput);
  elements.registerNumber.addEventListener("input", () => {
    elements.registerNumber.value = elements.registerNumber.value.toUpperCase();
    validateField(elements.registerNumber, validateRegisterNumber);
  });
  elements.department.addEventListener("change", () => validateField(elements.department, validateDepartment));
  elements.year.addEventListener("change", () => validateField(elements.year, validateYear));
  elements.section.addEventListener("change", () => validateField(elements.section, validateSection));

  elements.transactionNumber.addEventListener("input", () => {
    elements.transactionNumber.value = elements.transactionNumber.value.toUpperCase();
    validateField(elements.transactionNumber, validateTransactionNumber);
  });
  elements.amount.addEventListener("input", () => validateField(elements.amount, validateAmount));
  elements.academicYear.addEventListener("change", () => validateField(elements.academicYear, validateAcademicYear));

  // Focus step tracking
  elements.studentCard.addEventListener("focusin", () => updateProgressUI(1));
  elements.paymentCard.addEventListener("focusin", () => updateProgressUI(2));
  elements.proofCard.addEventListener("focusin", () => updateProgressUI(3));

  // File Upload Drag & Drop and File Picker
  setupFileUploadListeners();

  // Form Submit
  elements.paymentForm.addEventListener("submit", handleFormSubmit);

  // Reset / Submit Another Response
  elements.btnAnotherResponse.addEventListener("click", resetPortalToNewSubmission);
}

// ==========================================================================
// 5. FILE UPLOAD HANDLING & VALIDATION
// ==========================================================================
function setupFileUploadListeners() {
  // Click dropzone triggers file dialog
  elements.uploadDropzone.addEventListener("click", (e) => {
    if (e.target !== elements.fileInput) {
      elements.fileInput.click();
    }
  });

  // Keyboard accessibility (Enter or Space triggers file dialog)
  elements.uploadDropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      elements.fileInput.click();
    }
  });

  // Change file button
  elements.btnChangeFile.addEventListener("click", (e) => {
    e.stopPropagation();
    elements.fileInput.click();
  });

  // Remove file button
  elements.btnRemoveFile.addEventListener("click", (e) => {
    e.stopPropagation();
    resetUploadedFile();
  });

  // File input change
  elements.fileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFile(e.target.files[0]);
    }
  });

  // Drag & Drop visual feedback
  ["dragenter", "dragover"].forEach((eventName) => {
    elements.uploadDropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      elements.uploadDropzone.classList.add("drag-over");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    elements.uploadDropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      elements.uploadDropzone.classList.remove("drag-over");
    });
  });

  elements.uploadDropzone.addEventListener("drop", (e) => {
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length > 0) {
      processSelectedFile(dt.files[0]);
    }
  });
}

/**
 * Validates, previews, and encodes the selected file
 */
function processSelectedFile(file) {
  clearFieldError(elements.uploadDropzone, elements.paymentProofError);
  hideGlobalAlert();

  if (!file) return;

  const fileName = file.name || "";
  const fileExt = fileName.split(".").pop().toLowerCase();
  const fileMime = file.type || "";

  // 1. File Type Validation
  const isValidExtension = ALLOWED_EXTENSIONS.includes(fileExt);
  const isValidMime = ALLOWED_MIME_TYPES.includes(fileMime);

  if (!isValidExtension || (!isValidMime && fileMime !== "")) {
    setFieldError(
      elements.uploadDropzone,
      elements.paymentProofError,
      "Please upload a JPG, JPEG, PNG or PDF file."
    );
    resetUploadedFile();
    return;
  }

  // 2. File Size Validation (Max 5 MB)
  if (file.size > MAX_FILE_SIZE_BYTES) {
    setFieldError(
      elements.uploadDropzone,
      elements.paymentProofError,
      "Payment proof must be 5 MB or smaller."
    );
    resetUploadedFile();
    return;
  }

  // File is valid: Store file details in state
  appState.selectedFile = file;
  appState.fileName = fileName;
  appState.fileMimeType = fileMime || getFallbackMime(fileExt);
  appState.fileSizeBytes = file.size;

  // Convert File to Base64 using FileReader
  const reader = new FileReader();

  reader.onloadstart = () => {
    renderFileSelectedUI(fileName, fileExt, file.size, "Validating & preparing...");
  };

  reader.onload = (event) => {
    const dataUrl = event.target.result;
    // Extract raw Base64 string without data:mime;base64, prefix
    const base64Index = dataUrl.indexOf(";base64,");
    if (base64Index !== -1) {
      appState.fileBase64 = dataUrl.substring(base64Index + 8);
    } else {
      appState.fileBase64 = dataUrl;
    }

    // Render Preview
    renderFileSelectedUI(fileName, fileExt, file.size, "Ready for upload", dataUrl);
    updateProgressUI(3);
  };

  reader.onerror = () => {
    setFieldError(
      elements.uploadDropzone,
      elements.paymentProofError,
      "Failed to read the selected file. Please try again."
    );
    resetUploadedFile();
  };

  reader.readAsDataURL(file);
}

function getFallbackMime(ext) {
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "pdf":
      return "application/pdf";
    default:
      return "application/octet-stream";
  }
}

/**
 * Updates UI to show file metadata and thumbnail/icon preview
 */
function renderFileSelectedUI(name, ext, sizeBytes, statusMsg, dataUrl = null) {
  elements.fileDisplayName.textContent = name;
  elements.fileTypeBadge.textContent = ext.toUpperCase();
  elements.fileDisplaySize.textContent = formatFileSize(sizeBytes);
  elements.fileStatePill.innerHTML = `<span class="status-indicator-dot"></span> ${statusMsg}`;

  // Clear previous preview
  elements.filePreviewSlot.innerHTML = "";

  if (ext === "pdf" || appState.fileMimeType === "application/pdf") {
    // Show PDF Document Badge
    elements.filePreviewSlot.innerHTML = `
      <div class="pdf-icon-badge" aria-label="PDF Document">
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <text x="7" y="18" font-size="6" font-weight="bold" fill="currentColor">PDF</text>
        </svg>
      </div>
    `;
  } else if (dataUrl) {
    // Show Image Thumbnail Preview
    const img = document.createElement("img");
    img.src = dataUrl;
    img.alt = "Receipt preview";
    img.className = "preview-thumb";
    elements.filePreviewSlot.appendChild(img);
  }

  // Toggle Visibility
  elements.uploadDropzone.classList.add("hidden");
  elements.selectedFileDisplay.classList.remove("hidden");
}

function resetUploadedFile() {
  appState.selectedFile = null;
  appState.fileBase64 = null;
  appState.fileMimeType = null;
  appState.fileName = null;
  appState.fileSizeBytes = 0;
  elements.fileInput.value = "";

  elements.selectedFileDisplay.classList.add("hidden");
  elements.uploadDropzone.classList.remove("hidden");
  elements.filePreviewSlot.innerHTML = "";
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return "0 KB";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// ==========================================================================
// 6. VALIDATION ENGINE
// ==========================================================================
function handleMobileInput() {
  // Strip non-digits
  elements.studentMobile.value = elements.studentMobile.value.replace(/\D/g, "");
  validateField(elements.studentMobile, validateMobile);
}

function validateName(value) {
  const trimmed = value.trim();
  if (!trimmed) return "Please enter the student's full name.";
  if (trimmed.length < 2) return "Student name must be at least 2 characters.";
  return null;
}

function validateMobile(value) {
  const trimmed = value.trim();
  if (!trimmed) return "Mobile number is required.";
  if (!INDIAN_MOBILE_REGEX.test(trimmed)) {
    return "Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).";
  }
  return null;
}

function validateRegisterNumber(value) {
  const trimmed = value.trim();
  if (!trimmed) return "Register number is required.";
  if (trimmed.length < 3) return "Please enter a valid register number.";
  return null;
}

function validateDepartment(value) {
  if (!value) return "Please select a department.";
  return null;
}

function validateYear(value) {
  if (!value) return "Please select the year of study.";
  return null;
}

function validateSection(value) {
  if (!value) return "Please select a section.";
  return null;
}

function validateTransactionNumber(value) {
  const trimmed = value.trim();
  if (!trimmed) return "Please enter your transaction number.";
  if (trimmed.length < 4) return "Transaction number must be at least 4 characters.";
  return null;
}

function validateAmount(value) {
  const num = parseFloat(value);
  if (!value || isNaN(num)) return "Amount is required.";
  if (num <= 0) return "Amount must be greater than ₹0.";
  return null;
}

function validateAcademicYear(value) {
  if (!value) return "Please select an academic year.";
  return null;
}

function validatePaymentProof() {
  if (!appState.selectedFile || !appState.fileBase64) {
    return "Payment proof is required. Please upload your receipt.";
  }
  return null;
}

/**
 * Validates a single field and displays inline feedback
 */
function validateField(inputElement, validationFn) {
  const errorElement = document.getElementById(inputElement.id + "Error");
  const errorMessage = validationFn(inputElement.value);

  if (errorMessage) {
    setFieldError(inputElement, errorElement, errorMessage);
    return false;
  } else {
    clearFieldError(inputElement, errorElement);
    return true;
  }
}

function setFieldError(inputElement, errorElement, message) {
  inputElement.classList.add("is-invalid");
  inputElement.setAttribute("aria-invalid", "true");
  if (errorElement) {
    errorElement.textContent = message;
  }
}

function clearFieldError(inputElement, errorElement) {
  inputElement.classList.remove("is-invalid");
  inputElement.removeAttribute("aria-invalid");
  if (errorElement) {
    errorElement.textContent = "";
  }
}

// ==========================================================================
// 7. PROGRESS TRACKER UI
// ==========================================================================
function updateProgressUI(stepNumber) {
  appState.activeStep = stepNumber;
  elements.progressSteps.forEach((stepEl) => {
    const step = parseInt(stepEl.getAttribute("data-step"), 10);
    stepEl.classList.remove("active", "completed");

    if (step < stepNumber) {
      stepEl.classList.add("completed");
    } else if (step === stepNumber) {
      stepEl.classList.add("active");
    }
  });
}

// ==========================================================================
// 8. FORM SUBMISSION & BACKEND INTEGRATION
// ==========================================================================
async function handleFormSubmit(e) {
  e.preventDefault();

  if (appState.isSubmitting) return;

  hideGlobalAlert();

  // Run comprehensive field validation
  const validationChecks = [
    { el: elements.studentName, fn: validateName, errEl: elements.studentNameError },
    { el: elements.studentMobile, fn: validateMobile, errEl: elements.studentMobileError },
    { el: elements.registerNumber, fn: validateRegisterNumber, errEl: elements.registerNumberError },
    { el: elements.department, fn: validateDepartment, errEl: elements.departmentError },
    { el: elements.year, fn: validateYear, errEl: elements.yearError },
    { el: elements.section, fn: validateSection, errEl: elements.sectionError },
    { el: elements.transactionNumber, fn: validateTransactionNumber, errEl: elements.transactionNumberError },
    { el: elements.amount, fn: validateAmount, errEl: elements.amountError },
    { el: elements.academicYear, fn: validateAcademicYear, errEl: elements.academicYearError }
  ];

  let firstInvalidElement = null;

  for (const check of validationChecks) {
    const errorMsg = check.fn(check.el.value);
    if (errorMsg) {
      setFieldError(check.el, check.errEl, errorMsg);
      if (!firstInvalidElement) {
        firstInvalidElement = check.el;
      }
    } else {
      clearFieldError(check.el, check.errEl);
    }
  }

  // Validate File Proof
  const proofError = validatePaymentProof();
  if (proofError) {
    setFieldError(elements.uploadDropzone, elements.paymentProofError, proofError);
    if (!firstInvalidElement) {
      firstInvalidElement = elements.uploadDropzone;
    }
  } else {
    clearFieldError(elements.uploadDropzone, elements.paymentProofError);
  }

  // If any validation errors exist, halt submission and scroll to first error
  if (firstInvalidElement) {
    firstInvalidElement.scrollIntoView({ behavior: "smooth", block: "center" });
    if (typeof firstInvalidElement.focus === "function") {
      firstInvalidElement.focus();
    }
    firstInvalidElement.classList.add("animate-shake");
    setTimeout(() => firstInvalidElement.classList.remove("animate-shake"), 400);
    return;
  }

  // Check Web App URL configuration
  const isDemoMode = !APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes("YOUR_APPS_SCRIPT_WEB_APP_URL");

  // Build Payload
  const payload = {
    name: elements.studentName.value.trim(),
    mobile: elements.studentMobile.value.trim(),
    registerNumber: elements.registerNumber.value.trim().toUpperCase(),
    department: elements.department.value,
    year: elements.year.value,
    section: elements.section.value,
    transactionNumber: elements.transactionNumber.value.trim().toUpperCase(),
    amount: parseFloat(elements.amount.value).toFixed(2),
    academicYear: elements.academicYear.value,
    fileName: appState.fileName,
    mimeType: appState.fileMimeType,
    fileSize: appState.fileSizeBytes,
    fileBase64: appState.fileBase64
  };

  // Lock submission state & show loading feedback
  setSubmittingState(true);

  try {
    // Step 1: Uploading payment proof...
    setSubmissionStepText("Uploading payment proof...");
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Step 2: Submitting payment details...
    setSubmissionStepText("Submitting payment details...");
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (isDemoMode) {
      // Demo / Local Test Mode Simulation
      console.info("Demo Mode Active: Simulating submission for Government Polytechnic College, Perundurai portal.", payload);
      const simulatedReceiptUrl = appState.selectedFile ? URL.createObjectURL(appState.selectedFile) : "#";
      renderSuccessScreen(payload, simulatedReceiptUrl);
      return;
    }

    // Send POST request to Google Apps Script
    // We send payload as text/plain JSON string to avoid CORS preflight (OPTIONS) restrictions
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      }
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const result = await response.json();

    if (result && result.success) {
      // Submission Succeeded: Transition to Success Screen
      renderSuccessScreen(payload, result.fileUrl);
    } else {
      // Backend returned business validation failure (e.g. duplicate transaction)
      const errorMsg = result && result.message 
        ? result.message 
        : "Your submission could not be completed. Please try again.";
      showGlobalAlert(errorMsg);
      elements.globalAlert.scrollIntoView({ behavior: "smooth", block: "center" });
      setSubmittingState(false);
    }
  } catch (error) {
    console.error("Submission error:", error);
    showGlobalAlert("Unable to connect to the payment server. Please check your internet connection and try again.");
    elements.globalAlert.scrollIntoView({ behavior: "smooth", block: "center" });
    setSubmittingState(false);
  }
}

// ==========================================================================
// 9. SUBMISSION STATE MANAGEMENT & SUCCESS RENDERING
// ==========================================================================
function setSubmittingState(isSubmitting) {
  appState.isSubmitting = isSubmitting;
  elements.btnSubmit.disabled = isSubmitting;

  if (isSubmitting) {
    elements.btnSubmitLabel.textContent = "Processing...";
    elements.submissionProgressBox.classList.remove("hidden");
  } else {
    elements.btnSubmitLabel.textContent = "Submit Payment";
    elements.submissionProgressBox.classList.add("hidden");
  }
}

function setSubmissionStepText(text) {
  elements.submissionStatusLabel.textContent = text;
}

function renderSuccessScreen(data, fileUrl) {
  // Update Progress to Complete (04)
  updateProgressUI(4);

  // Populate Summary Details
  elements.sumStudentName.textContent = data.name;
  elements.sumRegisterNumber.textContent = data.registerNumber;
  elements.sumDeptYear.textContent = `${data.department} · ${data.year} (${data.section})`;
  elements.sumTransactionNumber.textContent = data.transactionNumber;
  elements.sumAmount.textContent = `₹ ${parseFloat(data.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  elements.sumAcademicYear.textContent = data.academicYear;

  // View Receipt Link
  if (fileUrl) {
    elements.linkViewReceipt.href = fileUrl;
    elements.linkViewReceipt.classList.remove("hidden");
  } else {
    elements.linkViewReceipt.classList.add("hidden");
  }

  // Hide Form, Reveal Success Screen
  elements.paymentForm.classList.add("hidden");
  elements.successScreen.classList.remove("hidden");
  elements.successScreen.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetPortalToNewSubmission() {
  // Reset Form Inputs
  elements.paymentForm.reset();

  // Reset File State
  resetUploadedFile();

  // Clear all error states
  document.querySelectorAll(".is-invalid").forEach((el) => el.classList.remove("is-invalid"));
  document.querySelectorAll(".field-error").forEach((el) => (el.textContent = ""));
  hideGlobalAlert();

  // Reset Submitting State
  setSubmittingState(false);

  // Hide Success Screen, Reveal Form
  elements.successScreen.classList.add("hidden");
  elements.paymentForm.classList.remove("hidden");

  // Reset Progress UI to Step 1
  updateProgressUI(1);

  // Scroll to top of main content
  document.getElementById("mainContent").scrollIntoView({ behavior: "smooth", block: "start" });
}

// ==========================================================================
// 10. ALERT UTILITIES
// ==========================================================================
function showGlobalAlert(message) {
  elements.globalAlertMessage.textContent = message;
  elements.globalAlert.classList.remove("hidden");
}

function hideGlobalAlert() {
  elements.globalAlert.classList.add("hidden");
  elements.globalAlertMessage.textContent = "";
}
