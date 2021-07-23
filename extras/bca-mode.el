;;; bca-mode.el --- Major mode for the Basic Computer Assembly  -*- lexical-binding: t; -*-

;;; Commentary:

;; Copyright 2021-present Naheel Azawy.  All rights reserved.

;; This program is free software; you can redistribute it and/or modify
;; it under the terms of the GNU General Public License as published by
;; the Free Software Foundation, either version 3 of the License, or
;; (at your option) any later version.

;; This program is distributed in the hope that it will be useful,
;; but WITHOUT ANY WARRANTY; without even the implied warranty of
;; MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
;; GNU General Public License for more details.

;; You should have received a copy of the GNU General Public License
;; along with this program.  If not, see <http://www.gnu.org/licenses/>.

;; Author: Naheel Azawy
;; Version: 1.0.0
;; Keywords: assembly languages
;; URL: https://github.com/Naheel-Azawy/bce
;;
;; This file is not part of GNU Emacs.
;;; Code:

;;;###autoload
(define-derived-mode bca-mode asm-mode "BCA"
  "Major mode for editing BCA files"
  (setq tab-always-indent nil)
  (setq indent-line-function #'indent-to-left-margin)
  (setq indent-tabs-mode t)
  (setq tab-width 8))
(add-to-list 'auto-mode-alist '("\\.bca\\'" . bca-mode))

(provide 'bca-mode)

;;; bca-mode.el ends here
