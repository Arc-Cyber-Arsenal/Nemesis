
const MarkdownRenderer = ({ content }) => {
  if (!content) return null;

  // Parse markdown content into structured sections
  const parseMarkdown = (text) => {
    const lines = text.split('\n');
    const sections = [];
    let currentSection = null;
    let currentSubsection = null;
    let currentList = [];
    let currentCodeBlock = [];

    const flushList = () => {
      if (currentList.length > 0) {
        if (currentSubsection) {
          currentSubsection.items = [...(currentSubsection.items || []), {
            type: 'list',
            items: currentList
          }];
        } else if (currentSection) {
          currentSection.items = [...(currentSection.items || []), {
            type: 'list',
            items: currentList
          }];
        }
        currentList = [];
      }
    };

    const flushCodeBlock = () => {
      if (currentCodeBlock.length > 0) {
        if (currentSubsection) {
          currentSubsection.items = [...(currentSubsection.items || []), {
            type: 'code',
            content: currentCodeBlock.join('\n')
          }];
        } else if (currentSection) {
          currentSection.items = [...(currentSection.items || []), {
            type: 'code',
            content: currentCodeBlock.join('\n')
          }];
        }
        currentCodeBlock = [];
      }
    };

    const flushSubsection = () => {
      if (currentSubsection) {
        flushList();
        flushCodeBlock();
        if (currentSection) {
          currentSection.subsections = [...(currentSection.subsections || []), currentSubsection];
        }
        currentSubsection = null;
      }
    };

    const flushSection = () => {
      flushSubsection();
      if (currentSection) {
        sections.push(currentSection);
        currentSection = null;
      }
    };

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed) continue;

      // Main section (## Title)
      if (trimmed.startsWith('## ')) {
        flushSection();
        currentSection = {
          title: trimmed.substring(3),
          subsections: [],
          items: []
        };
      }
      // Subsection (**Title:**)
      else if (trimmed.startsWith('**') && trimmed.endsWith(':**')) {
        flushSubsection();
        currentSubsection = {
          title: trimmed.substring(2, trimmed.length - 3),
          items: []
        };
      }
      // List item (- item)
      else if (trimmed.startsWith('- ')) {
        currentList.push(trimmed.substring(2));
      }
      // Code-like content (PORT STATE SERVICE, etc.)
      else if (trimmed.includes('/tcp') || trimmed.includes('PORT') || trimmed.includes('STATE')) {
        currentCodeBlock.push(trimmed);
      }
      // Regular text
      else {
        flushList();
        flushCodeBlock();
        if (currentSubsection) {
          currentSubsection.items = [...(currentSubsection.items || []), {
            type: 'text',
            content: trimmed
          }];
        } else if (currentSection) {
          currentSection.items = [...(currentSection.items || []), {
            type: 'text',
            content: trimmed
          }];
        }
      }
    }

    flushSection();
    return sections;
  };

  const sections = parseMarkdown(content);

  return (
    <div className="space-y-6">
      {sections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="space-y-4">
          {/* Section Title */}
          <h3 className="text-lg font-semibold text-neutral-800 dark:text-white border-b border-neutral-200 dark:border-neutral-700 pb-2">
            {section.title}
          </h3>

          {/* Section Items */}
          {section.items.map((item, itemIndex) => (
            <div key={itemIndex}>
              {item.type === 'text' && (
                <div className="text-sm text-neutral-700 dark:text-neutral-200 leading-relaxed mb-2">
                  {item.content}
                </div>
              )}
              {item.type === 'list' && (
                <div className="space-y-1">
                  {item.items.map((listItem, listIndex) => (
                    <div key={listIndex} className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                      <span className="text-neutral-400 dark:text-neutral-500 mt-1">•</span>
                      <span>{listItem}</span>
                    </div>
                  ))}
                </div>
              )}
              {item.type === 'code' && (
                <div className="bg-neutral-900 dark:bg-neutral-800 text-neutral-100 dark:text-neutral-200 p-3 rounded border border-neutral-700 dark:border-neutral-600 text-xs font-mono overflow-x-auto">
                  <pre>{item.content}</pre>
                </div>
              )}
            </div>
          ))}

          {/* Subsections */}
          {section.subsections.map((subsection, subIndex) => (
            <div key={subIndex} className="ml-4 space-y-3">
              <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                {subsection.title}
              </h4>
              <div className="space-y-2">
                {subsection.items.map((item, itemIndex) => (
                  <div key={itemIndex}>
                    {item.type === 'text' && (
                      <div className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                        {item.content}
                      </div>
                    )}
                    {item.type === 'list' && (
                      <div className="space-y-1">
                        {item.items.map((listItem, listIndex) => (
                          <div key={listIndex} className="flex items-start gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                            <span className="text-neutral-400 dark:text-neutral-500 mt-1">•</span>
                            <span>{listItem}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {item.type === 'code' && (
                      <div className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-2 rounded text-xs font-mono">
                        <pre className="whitespace-pre-wrap text-neutral-900 dark:text-neutral-200">{item.content}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default MarkdownRenderer;