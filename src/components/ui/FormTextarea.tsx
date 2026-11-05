'use client'

import React, { TextareaHTMLAttributes, forwardRef } from 'react';
import { useLocale, localizeUiText } from '@/contexts/LocaleContext'

export interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ label, error, helperText, className, ...props }, ref) => {
    const { locale, uiTranslationsEnabled } = useLocale()
    return (
      <div className="mb-4">
        {label && (
          <label
            htmlFor={props.id}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            {localizeUiText(label, locale, uiTranslationsEnabled)}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <textarea
          ref={ref}
          className={`
            form-textarea
            min-h-[100px]
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
            ${className || ''}
          `}
          {...props}
          placeholder={localizeUiText(props.placeholder, locale, uiTranslationsEnabled)}
        />

        {error && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{localizeUiText(error, locale, uiTranslationsEnabled)}</p>
        )}

        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{localizeUiText(helperText, locale, uiTranslationsEnabled)}</p>
        )}
      </div>
    );
  }
);

FormTextarea.displayName = 'FormTextarea';

export default FormTextarea;