import React, { useState } from 'react';

export default function TaskInputBox() {
  const [taskName, setTaskName] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="w-full bg-white rounded-2xl shadow-[0_3px_10px_rgb(0,0,0,0.1)] p-6 md:p-8 max-w-lg mx-auto">
      <h3 className="text-xl font-medium text-slate-800 tracking-tight font-sans mb-6">New Task</h3>
      
      {/* Material Design Outlined Text Field */}
      <div className="relative mb-8">
        <input
          type="text"
          id="task-name"
          value={taskName}
          onChange={(e) => setTaskName(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="e.g., Complete quarterly report"
          className="peer w-full h-14 bg-transparent text-slate-900 border-2 border-slate-300 rounded-md px-4 pt-4 pb-2 focus:outline-none focus:border-indigo-600 transition-colors placeholder-transparent focus:placeholder-slate-400"
        />
        <label
          htmlFor="task-name"
          className={`absolute left-3 px-1 transition-all duration-200 bg-white pointer-events-none
            ${isFocused || taskName 
              ? '-top-2.5 text-xs font-medium text-indigo-600' 
              : 'top-4 text-base text-slate-500'
            }
          `}
        >
          Task Name
        </label>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end items-center gap-2 mt-4">
        {/* Material Text Button */}
        <button
          onClick={() => setTaskName('')}
          type="button"
          className="px-5 py-2.5 text-sm font-medium tracking-wide text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors uppercase"
        >
          Cancel
        </button>
        {/* Material Contained Button */}
        <button
          type="button"
          disabled={!taskName.trim()}
          className="px-6 py-2.5 text-sm font-medium tracking-wide text-white bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg active:shadow-sm rounded-md transition-all uppercase disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
        >
          Add Task
        </button>
      </div>
    </div>
  );
}
