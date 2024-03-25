import { defineAppConfig } from '#imports';
export default defineAppConfig({
  ui: {
    primary: 'sand',
    gray: 'sand',
    accent: 'sand',
    base: 'sand',
    colors: ['sand', 'base', 'bronze', 'green', 'red', 'amber', 'blue'],
    safelistColors: ['sand'],

    // Button
    button: {
      color: {
        white: {
          solid:
            'shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 text-gray-900 dark:text-white bg-white hover:bg-gray-50 disabled:bg-white dark:bg-gray-900 dark:hover:bg-gray-800/50 dark:disabled:bg-gray-900 focus-visible:ring-2 focus-visible:ring-primary-500 dark:focus-visible:ring-primary-400',
          ghost:
            'text-gray-900 dark:text-white hover:bg-white dark:hover:bg-gray-900 focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-primary-500 dark:focus-visible:ring-primary-400'
        },
        gray: {
          solid:
            'shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 text-gray-700 dark:text-gray-200 bg-gray-50 hover:bg-gray-100 disabled:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700/50 dark:disabled:bg-gray-800 focus-visible:ring-2 focus-visible:ring-primary-500 dark:focus-visible:ring-primary-400',
          ghost:
            'text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-primary-500 dark:focus-visible:ring-primary-400',
          link: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline-offset-4 hover:underline focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-primary-500 dark:focus-visible:ring-primary-400'
        },
        black: {
          solid:
            'shadow-sm text-white dark:text-gray-900 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-900 dark:bg-white dark:hover:bg-gray-100 dark:disabled:bg-white focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-primary-500 dark:focus-visible:ring-primary-400',
          link: 'text-gray-900 dark:text-white underline-offset-4 hover:underline focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-primary-500 dark:focus-visible:ring-primary-400'
        }
      },
      variant: {
        solid:
          'shadow-sm text-white dark:text-white bg-{color}-9 hover:bg-{color}-10 active:brightness-105 disabled:bg-{color}-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-{color}-5 dark:focus-visible:outline-{color}-4 dark:bg-{color}-9 dark:hover:bg-{color}-10 dark:active:brightness-105 dark:disabled:bg-{color}-3 dark:focus-visible:outline-{color}-5 dark:focus-visible:outline-{color}-4',
        outline:
          'ring-1 ring-inset ring-{color}-8 active:ring-{color}-9 active:bg-{color}-5 text-{color}-11 hover:bg-{color}-3 disabled:bg-transparent disabled:text-{color}-3 disabled:ring-{color}-3 focus-visible:ring-2 focus-visible:ring-{color}-9 dark:ring-{color}-8 dark:active:ring-{color}-9 dark:active:bg-{color}-5 dark:text-{color}-11 dark:hover:bg-{color}-3 dark:disabled:bg-transparent dark:disabled:text-{color}-3 dark:disabled:ring-{color}-3 dark:focus-visible:ring-{color}-9 ',
        soft: 'text-{color}-11 bg-{color}-3 hover:bg-{color}-4 active:bg-{color}-5 disabled:bg-{color}-1 disabled:text-{color}-3 dark:text-{color}-11 dark:bg-{color}-3 dark:hover:bg-{color}-5 dark:active:bg-{color}-5 dark:disabled:bg-{color}-1 dark:disabled:text-{color}-3 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-{color}-5 dark:focus-visible:ring-{color}-5 ',
        ghost:
          'text-{color}-11 hover:bg-{color}-3 active:bg-{color}-4 disabled:bg-transparent disabled:text-{color}-3 dark:text-{color}-11 dark:hover:bg-{color}-3 dark:active:bg-{color}-5 dark:disabled:bg-transparent dark:disabled:text-{color}-3 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-{color}-5 dark:focus-visible:ring-{color}-5',
        link: 'text-{color}-11 hover:text-{color}-12 disabled:text-{color}-3 underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-{color}-9'
      },
      default: {
        size: 'sm',
        variant: 'solid',
        color: 'sand',
        loadingIcon: 'i-heroicons-arrow-path-20-solid'
      }
    },

    //badge
    badge: {
      base: 'inline-flex items-center',
      rounded: 'rounded-md',
      font: 'font-medium',
      size: {
        xs: 'text-xs px-1.5 py-0.5',
        sm: 'text-xs px-2 py-1',
        md: 'text-sm px-2 py-1',
        lg: 'text-sm px-2.5 py-1.5'
      },
      color: {
        white: {
          solid:
            'ring-1 ring-inset ring-gray-300 dark:ring-gray-700 text-gray-900 dark:text-white bg-white dark:bg-gray-900'
        },
        gray: {
          solid:
            'ring-1 ring-inset ring-gray-300 dark:ring-gray-700 text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-800'
        },
        black: {
          solid: 'text-white dark:text-gray-900 bg-gray-900 dark:bg-white'
        }
      },
      variant: {
        solid: 'bg-{color}-9 dark:bg-{color}-9 text-white dark:text-white',
        outline:
          'text-{color}-11 dark:text-{color}-11 ring-1 ring-inset ring-{color}-9 dark:ring-{color}-9',
        soft: 'bg-{color}-3 dark:bg-{color}-3 text-{color}-11 dark:text-{color}-11',
        subtle:
          'bg-{color}-3 dark:bg-{color}-3 text-{color}-11 dark:text-{color}-11 ring-1 ring-inset ring-{color}-8 dark:ring-{color}-8 ring-opacity-25 dark:ring-opacity-25'
      },
      default: {
        size: 'sm',
        variant: 'solid',
        color: 'sand'
      }
    },

    // modal
    modal: {
      overlay: {
        base: 'fixed inset-0 transition-opacity',
        background: 'bg-base-1 dark:bg-base-1 opacity-75 backdrop-blur-lg'
      },
      background: 'bg-base-3 dark:bg-base-3',
      ring: 'ring-sand-9 dark:ring-sand-9 ring-1',
      rounded: 'rounded-lg',
      shadow: 'shadow-xl'
    },

    // vertical Nav
    verticalNavigation: {
      base: 'group relative flex items-center gap-1.5 focus:outline-none focus-visible:outline-none dark:focus-visible:outline-none focus-visible:before:ring-inset focus-visible:before:ring-1 focus-visible:before:ring-base-7 dark:focus-visible:before:ring-base-7 before:absolute before:inset-px before:rounded-md disabled:cursor-not-allowed disabled:opacity-75',
      ring: 'focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-base-7 dark:focus-visible:ring-base-7',
      active:
        'text-base-12 dark:text-base-12 before:bg-base-4 dark:before:bg-base-4',
      inactive:
        'text-base-11 dark:text-base-11 hover:text-base-12 dark:hover:text-base-12 hover:before:bg-base-4 dark:hover:before:bg-base-4',
      icon: {
        base: 'flex-shrink-0 w-5 h-5 relative',
        active: 'text-base-11 dark:text-base11',
        inactive:
          'text-base-10 dark:text-base-10 group-hover:text-base-11 dark:group-hover:text-base-11'
      },
      avatar: {
        base: 'flex-shrink-0',
        size: '2xs'
      },
      badge: {
        base: 'flex-shrink-0 ml-auto relative rounded',
        color: 'gray',
        variant: 'solid',
        size: 'xs'
      },
      divider: {
        wrapper: {
          base: 'p-2'
        }
      }
    },

    // toggle
    toggle: {
      base: 'relative inline-flex flex-shrink-0 border-2 border-transparent disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none m-1',
      rounded: 'rounded-full',
      ring: 'ring-1 ring-accent-7 focus-visible:ring-2 focus-visible:ring-accent-7 dark:focus-visible:ring-accent-7 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-white',
      active: 'bg-accent-9 dark:bg-accent-9',
      inactive: 'bg-accent-5 dark:bg-accent-5',
      size: {
        '2xs': 'h-3 w-5',
        xs: 'h-3.5 w-6',
        sm: 'h-4 w-7',
        md: 'h-5 w-9',
        lg: 'h-6 w-11',
        xl: 'h-7 w-[3.25rem]',
        '2xl': 'h-8 w-[3.75rem]'
      },
      container: {
        base: 'pointer-events-none relative inline-block rounded-full bg-white dark:bg-white shadow transform ring-0 transition ease-in-out duration-200',
        active: {
          '2xs': 'translate-x-2 rtl:-translate-x-2',
          xs: 'translate-x-2.5 rtl:-translate-x-2.5',
          sm: 'translate-x-3 rtl:-translate-x-3',
          md: 'translate-x-4 rtl:-translate-x-4',
          lg: 'translate-x-5 rtl:-translate-x-5',
          xl: 'translate-x-6 rtl:-translate-x-6',
          '2xl': 'translate-x-7 rtl:-translate-x-7'
        },
        inactive: 'translate-x-0 rtl:-translate-x-0',
        size: {
          '2xs': 'h-2 w-2',
          xs: 'h-2.5 w-2.5',
          sm: 'h-3 w-3',
          md: 'h-4 w-4',
          lg: 'h-5 w-5',
          xl: 'h-6 w-6',
          '2xl': 'h-7 w-7'
        }
      },
      icon: {
        base: 'absolute inset-0 h-full w-full flex items-center justify-center transition-opacity',
        active: 'opacity-100 ease-in duration-200',
        inactive: 'opacity-0 ease-out duration-100',
        size: {
          '2xs': 'h-2 w-2',
          xs: 'h-2 w-2',
          sm: 'h-2 w-2',
          md: 'h-3 w-3',
          lg: 'h-4 w-4',
          xl: 'h-5 w-5',
          '2xl': 'h-6 w-6'
        },
        on: 'text-{color}-500 dark:text-{color}-400',
        off: 'text-gray-400 dark:text-gray-500'
      },
      default: {
        onIcon: null,
        offIcon: null,
        color: 'primary',
        size: 'md'
      }
    },
    // select
    select: {
      wrapper: 'relative',
      base: 'relative block w-full disabled:cursor-not-allowed disabled:opacity-75 focus:outline-none border-0',
      form: 'form-select',
      rounded: 'rounded-md',
      placeholder: 'text-base-11 dark:text-base-11',
      file: {
        base: 'file:cursor-pointer file:rounded-l-md file:absolute file:left-0 file:inset-y-0 file:font-medium file:m-0 file:border-0 file:ring-1 file:ring-base-7 dark:file:ring-base-7 file:text-base-11 dark:file:text-base-11 file:bg-base-3 hover:file:bg-base-4 dark:file:bg-base-3 dark:hover:file:bg-base-4',
        padding: {
          '2xs': 'ps-[85px]',
          xs: 'ps-[87px]',
          sm: 'ps-[96px]',
          md: 'ps-[98px]',
          lg: 'ps-[100px]',
          xl: 'ps-[109px]'
        }
      },
      size: {
        '2xs': 'text-xs',
        xs: 'text-xs',
        sm: 'text-sm',
        md: 'text-sm',
        lg: 'text-sm',
        xl: 'text-base'
      },
      gap: {
        '2xs': 'gap-x-1',
        xs: 'gap-x-1.5',
        sm: 'gap-x-1.5',
        md: 'gap-x-2',
        lg: 'gap-x-2.5',
        xl: 'gap-x-2.5'
      },
      padding: {
        '2xs': 'px-2 py-1',
        xs: 'px-2.5 py-1.5',
        sm: 'px-2.5 py-1.5',
        md: 'px-3 py-2',
        lg: 'px-3.5 py-2.5',
        xl: 'px-3.5 py-2.5'
      },
      leading: {
        padding: {
          '2xs': 'ps-7',
          xs: 'ps-8',
          sm: 'ps-9',
          md: 'ps-10',
          lg: 'ps-11',
          xl: 'ps-12'
        }
      },
      trailing: {
        padding: {
          '2xs': 'pe-7',
          xs: 'pe-8',
          sm: 'pe-9',
          md: 'pe-10',
          lg: 'pe-11',
          xl: 'pe-12'
        }
      },
      color: {
        white: {
          outline:
            'shadow-sm bg-base-2 dark:bg-base-2 text-base-12 dark:text-base-12 ring-1 ring-inset ring-base-7 dark:ring-base-7 focus:ring-2 focus:ring-base-9 dark:focus:ring-base-9'
        },
        gray: {
          outline:
            'shadow-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-700 focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400'
        }
      },
      variant: {
        outline:
          'shadow-sm bg-transparent text-base-12 dark:text-base-12 ring-1 ring-inset ring-{color}-7 dark:ring-{color}-7 focus:ring-2 focus:ring-{color}-8 dark:focus:ring-{color}-8',
        none: 'bg-transparent focus:ring-0 focus:shadow-none'
      },
      icon: {
        base: 'flex-shrink-0 text-base-11 dark:text-base-11',
        color: 'text-{color}-9 dark:text-{color}-9',
        loading: 'animate-spin',
        size: {
          '2xs': 'h-4 w-4',
          xs: 'h-4 w-4',
          sm: 'h-5 w-5',
          md: 'h-5 w-5',
          lg: 'h-5 w-5',
          xl: 'h-6 w-6'
        },
        leading: {
          wrapper: 'absolute inset-y-0 start-0 flex items-center',
          pointer: 'pointer-events-none',
          padding: {
            '2xs': 'px-2',
            xs: 'px-2.5',
            sm: 'px-2.5',
            md: 'px-3',
            lg: 'px-3.5',
            xl: 'px-3.5'
          }
        },
        trailing: {
          wrapper: 'absolute inset-y-0 end-0 flex items-center',
          pointer: 'pointer-events-none',
          padding: {
            '2xs': 'px-2',
            xs: 'px-2.5',
            sm: 'px-2.5',
            md: 'px-3',
            lg: 'px-3.5',
            xl: 'px-3.5'
          }
        }
      },
      default: {
        size: 'sm',
        color: 'white',
        variant: 'outline',
        loadingIcon: 'i-heroicons-arrow-path-20-solid',
        trailingIcon: 'i-heroicons-chevron-down-20-solid'
      }
    },

    // select menu
    selectMenu: {
      container: 'z-20 group',
      trigger: 'flex items-center w-full',
      width: 'w-full',
      height: 'max-h-60',
      base: 'relative focus:outline-none overflow-y-auto scroll-py-1',
      background: 'bg-base-2 dark:bg-base-2',
      shadow: 'shadow-lg',
      rounded: 'rounded-md',
      padding: 'p-1',
      ring: 'ring-1 ring-base-7 dark:ring-base-7',
      empty: 'text-sm text-base-11 dark:text-base-11 px-2 py-1.5',
      option: {
        base: 'cursor-default select-none relative flex items-center justify-between gap-1',
        rounded: 'rounded-md',
        padding: 'px-1.5 py-1.5',
        size: 'text-sm',
        color: 'text-base-12 dark:text-base-12',
        container: 'flex items-center gap-1.5 min-w-0',
        active: 'bg-base-5 dark:bg-base-5',
        inactive: '',
        selected: 'pe-7',
        disabled: 'cursor-not-allowed opacity-50',
        empty: 'text-sm text-base-11 dark:text-base-11 px-2 py-1.5',
        icon: {
          base: 'flex-shrink-0 h-5 w-5',
          active: 'text-base-12 dark:text-base-12',
          inactive: 'text-base-11 dark:text-base-11'
        },
        selectedIcon: {
          wrapper: 'absolute inset-y-0 end-0 flex items-center',
          padding: 'pe-2',
          base: 'h-5 w-5 text-base-12 dark:text-base-12 flex-shrink-0'
        },
        avatar: {
          base: 'flex-shrink-0',
          size: '2xs'
        },
        chip: {
          base: 'flex-shrink-0 w-2 h-2 mx-1 rounded-full'
        },
        create: 'block truncate'
      },
      transition: {
        leaveActiveClass: 'transition ease-in duration-100',
        leaveFromClass: 'opacity-100',
        leaveToClass: 'opacity-0'
      },
      popper: {
        placement: 'bottom-end'
      },
      default: {
        selectedIcon: 'i-heroicons-check-20-solid',
        clearSearchOnClose: false,
        showCreateOptionWhen: 'empty'
      },
      arrow: {
        base: 'invisible before:visible before:block before:rotate-45 before:z-[-1] before:w-2 before:h-2',
        ring: 'before:ring-1 before:ring-base-7 dark:ring-base-7',
        rounded: 'before:rounded-sm',
        background: 'before:bg-base-2 dark:before:bg-base-2',
        shadow: 'before:shadow',
        placement:
          "group-data-[popper-placement*='right']:-left-1 group-data-[popper-placement*='left']:-right-1 group-data-[popper-placement*='top']:-bottom-1 group-data-[popper-placement*='bottom']:-top-1"
      },
      select: 'inline-flex items-center text-left cursor-default',
      input:
        'block w-[calc(100%+0.5rem)] focus:ring-transparent text-sm px-3 py-1.5 text-base-11 dark:text-base-11 bg-base-1 dark:bg-base-1 border-0 border-b border-base-6 dark:border-base-6 sticky -top-1 -mt-1 mb-1 -mx-1 z-10 placeholder-base-11 dark:placeholder-base-11 focus:outline-none',
      required: 'absolute inset-0 w-px opacity-0 cursor-default',
      label: 'block truncate'
    },

    //tooltip
    tooltip: {
      wrapper: 'relative inline-flex',
      container: 'z-50 group',
      width: 'max-w-xs',
      background: 'bg-base-3 dark:bg-base-3',
      color: 'text-base-12 dark:text-base-12',
      shadow: 'shadow',
      rounded: 'rounded',
      ring: 'ring-0 ring-base-7 dark:ring-base-7',
      base: '[@media(pointer:coarse)]:hidden h-6 px-2 py-1 text-xs font-normal truncate relative',
      shortcuts: 'hidden md:inline-flex flex-shrink-0 gap-0.5',
      middot: 'mx-1 text-base-11 dark:text-base-11',
      transition: {
        enterActiveClass: 'transition ease-out duration-200',
        enterFromClass: 'opacity-0 translate-y-1',
        enterToClass: 'opacity-100 translate-y-0',
        leaveActiveClass: 'transition ease-in duration-150',
        leaveFromClass: 'opacity-100 translate-y-0',
        leaveToClass: 'opacity-0 translate-y-1'
      },
      popper: {
        strategy: 'fixed'
      },
      default: {
        openDelay: 0,
        closeDelay: 0
      },
      arrow: {
        base: '[@media(pointer:coarse)]:hidden invisible before:visible before:block before:rotate-45 before:z-[-1] before:w-2 before:h-2',
        ring: 'before:ring-0 before:ring-base-7 dark:before:ring-base-7',
        rounded: 'before:rounded-sm',
        background: 'before:bg-base-3 dark:before:bg-base-3',
        shadow: 'before:shadow',
        placement:
          "group-data-[popper-placement*='right']:-left-1 group-data-[popper-placement*='left']:-right-1 group-data-[popper-placement*='top']:-bottom-1 group-data-[popper-placement*='bottom']:-top-1"
      }
    },

    // avatar
    avatar: {
      wrapper: 'relative inline-flex items-center justify-center flex-shrink-0',
      background: 'bg-base-7 dark:bg-base-7',
      rounded: 'rounded-full',
      text: 'font-medium leading-none text-gray-900 dark:text-white truncate',
      placeholder:
        'font-medium leading-none text-base-3 dark:text-base-3 truncate',
      size: {
        '3xs': 'h-4 w-4 text-[8px]',
        '2xs': 'h-5 w-5 text-[10px]',
        xs: 'h-6 w-6 text-xs',
        sm: 'h-8 w-8 text-sm',
        md: 'h-10 w-10 text-base',
        lg: 'h-12 w-12 text-lg',
        xl: 'h-14 w-14 text-xl',
        '2xl': 'h-16 w-16 text-2xl',
        '3xl': 'h-20 w-20 text-3xl'
      },
      chip: {
        base: 'absolute rounded-full ring-1 ring-white dark:ring-gray-900 flex items-center justify-center text-white dark:text-gray-900 font-medium',
        background: 'bg-{color}-500 dark:bg-{color}-400',
        position: {
          'top-right': 'top-0 right-0',
          'bottom-right': 'bottom-0 right-0',
          'top-left': 'top-0 left-0',
          'bottom-left': 'bottom-0 left-0'
        },
        size: {
          '3xs': 'h-[4px] min-w-[4px] text-[4px] p-px',
          '2xs': 'h-[5px] min-w-[5px] text-[5px] p-px',
          xs: 'h-1.5 min-w-[0.375rem] text-[6px] p-px',
          sm: 'h-2 min-w-[0.5rem] text-[7px] p-0.5',
          md: 'h-2.5 min-w-[0.625rem] text-[8px] p-0.5',
          lg: 'h-3 min-w-[0.75rem] text-[10px] p-0.5',
          xl: 'h-3.5 min-w-[0.875rem] text-[11px] p-1',
          '2xl': 'h-4 min-w-[1rem] text-[12px] p-1',
          '3xl': 'h-5 min-w-[1.25rem] text-[14px] p-1'
        }
      },
      icon: {
        base: 'text-base-3 dark:text-base-3 flex-shrink-0',
        size: {
          '3xs': 'h-2 w-2',
          '2xs': 'h-2.5 w-2.5',
          xs: 'h-3 w-3',
          sm: 'h-4 w-4',
          md: 'h-5 w-5',
          lg: 'h-6 w-6',
          xl: 'h-7 w-7',
          '2xl': 'h-8 w-8',
          '3xl': 'h-10 w-10'
        }
      },
      default: {
        size: 'sm',
        icon: null,
        chipColor: null,
        chipPosition: 'top-right'
      }
    },
    //avatar group
    avatarGroup: {
      wrapper: 'inline-flex flex-row-reverse justify-end',
      ring: 'ring-0 ring-base-5 dark:ring-base-5',
      margin: '-me-1.5 first:me-0'
    },

    // dropdown
    dropdown: {
      width: 'w-52',
      background: 'bg-base-1 dark:bg-base-3',
      ring: 'ring-1 ring-base-7 dark:ring-base-7',
      divide: 'divide-y divide-base-6 dark:divide-base-6',
      padding: 'p-2',
      item: {
        base: 'group flex items-center gap-1.5 w-full',
        rounded: 'rounded-md',
        padding: 'px-1.5 py-1.5',
        size: 'text-sm',
        active: 'bg-base-3 dark:bg-base-2 text-base-12 dark:text-base-12',
        inactive: 'text-base-12 dark:text-base-12',
        disabled: 'cursor-not-allowed opacity-50',
        icon: {
          base: 'flex-shrink-0 w-5 h-5',
          active: 'text-base-11 dark:text-base-11',
          inactive: 'text-base-10 dark:text-base-10'
        },
        avatar: {
          base: 'flex-shrink-0',
          size: '2xs'
        },
        label: 'truncate',
        shortcuts: 'hidden md:inline-flex flex-shrink-0 gap-0.5 ms-auto'
      },
      arrow: {
        base: 'invisible before:visible before:block before:rotate-45 before:z-[-1] before:w-2 before:h-2',
        ring: 'before:ring-1 before:ring-base-3 dark:before:ring-base-3',
        rounded: 'before:rounded-sm',
        background: 'before:bg-base-1 dark:before:bg-base-1',
        shadow: 'before:shadow',
        placement:
          "group-data-[popper-placement*='right']:-left-1 group-data-[popper-placement*='left']:-right-1 group-data-[popper-placement*='top']:-bottom-1 group-data-[popper-placement*='bottom']:-top-1"
      }
    },

    // toast
    notification: {
      title: 'text-sm font-medium text-base-12 dark:text-base-12',
      description: 'mt-1 text-sm leading-4 text-base-11 dark:text-base-11',
      background: 'bg-base-3 dark:bg-base-3',
      ring: 'ring-1 ring-base-7 dark:ring-base-7',
      icon: {
        base: 'flex-shrink-0 w-5 h-5',
        color: 'text-{color}-9 dark:text-{color}-9'
      },
      progress: {
        base: 'absolute bottom-0 end-0 start-0 h-1',
        background: 'bg-{color}-9 dark:bg-{color}-9'
      },
      default: {
        color: 'green',
        icon: null,
        timeout: 5000,
        closeButton: {
          icon: 'i-heroicons-x-mark-20-solid',
          color: 'base',
          variant: 'link',
          padded: false
        },
        actionButton: {
          size: 'xs',
          color: 'white'
        }
      }
    }
  }
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const sand = [
  'bg-sand-1',
  'bg-sand-2',
  'bg-sand-3',
  'hover:bg-sand-3',
  'bg-sand-4',
  'hover:bg-sand-4',
  'active:bg-sand-4',
  'bg-sand-5',
  'hover:bg-sand-5',
  'active:bg-sand-5',
  'bg-sand-9',
  'bg-sand-10',
  'hover:bg-sand-10',
  'bg-sand-11',
  'bg-sand-12',
  'text-sand-5',
  'text-sand-9',
  'text-sand-10',
  'text-sand-11',
  'hover:text-sand-12',
  'ring-sand-5',
  'ring-sand-8',
  'ring-sand-9',
  'active:ring-sand-9'
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const bronze = [
  'bg-bronze-1',
  'bg-bronze-2',
  'bg-bronze-3',
  'hover:bg-bronze-3',
  'bg-bronze-4',
  'hover:bg-bronze-4',
  'active:bg-bronze-4',
  'bg-bronze-5',
  'hover:bg-bronze-5',
  'active:bg-bronze-5',
  'bg-bronze-9',
  'bg-bronze-10',
  'hover:bg-bronze-10',
  'bg-bronze-11',
  'bg-bronze-12',
  'text-bronze-5',
  'text-bronze-9',
  'text-bronze-10',
  'text-bronze-11',
  'hover:text-bronze-12',
  'ring-bronze-5',
  'ring-bronze-8',
  'ring-bronze-9',
  'active:ring-bronze-9'
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const green = [
  'bg-green-1',
  'bg-green-2',
  'bg-green-3',
  'hover:bg-green-3',
  'bg-green-4',
  'hover:bg-green-4',
  'active:bg-green-4',
  'bg-green-5',
  'hover:bg-green-5',
  'active:bg-green-5',
  'bg-green-9',
  'bg-green-10',
  'hover:bg-green-10',
  'bg-green-11',
  'bg-green-12',
  'text-green-5',
  'text-green-9',
  'text-green-10',
  'text-green-11',
  'hover:text-green-12',
  'ring-green-5',
  'ring-green-8',
  'ring-green-9',
  'active:ring-green-9'
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const red = [
  'bg-red-1',
  'bg-red-2',
  'bg-red-3',
  'hover:bg-red-3',
  'bg-red-4',
  'hover:bg-red-4',
  'active:bg-red-4',
  'bg-red-5',
  'hover:bg-red-5',
  'active:bg-red-5',
  'bg-red-9',
  'bg-red-10',
  'hover:bg-red-10',
  'bg-red-11',
  'bg-red-12',
  'text-red-5',
  'text-red-9',
  'text-red-10',
  'text-red-11',
  'hover:text-red-12',
  'ring-red-5',
  'ring-red-8',
  'ring-red-9',
  'active:ring-red-9'
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const amber = [
  'bg-amber-1',
  'bg-amber-2',
  'bg-amber-3',
  'hover:bg-amber-3',
  'bg-amber-4',
  'hover:bg-amber-4',
  'active:bg-amber-4',
  'bg-amber-5',
  'hover:bg-amber-5',
  'active:bg-amber-5',
  'bg-amber-9',
  'bg-amber-10',
  'hover:bg-amber-10',
  'bg-amber-11',
  'bg-amber-12',
  'text-amber-5',
  'text-amber-9',
  'text-amber-10',
  'text-amber-11',
  'hover:text-amber-12',
  'ring-amber-5',
  'ring-amber-8',
  'ring-amber-9',
  'active:ring-amber-9'
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const blue = [
  'bg-blue-1',
  'bg-blue-2',
  'bg-blue-3',
  'hover:bg-blue-3',
  'bg-blue-4',
  'hover:bg-blue-4',
  'active:bg-blue-4',
  'bg-blue-5',
  'hover:bg-blue-5',
  'active:bg-blue-5',
  'bg-blue-9',
  'bg-blue-10',
  'hover:bg-blue-10',
  'bg-blue-11',
  'bg-blue-12',
  'text-blue-5',
  'text-blue-9',
  'text-blue-10',
  'text-blue-11',
  'hover:text-blue-12',
  'ring-blue-5',
  'ring-blue-8',
  'ring-blue-9',
  'active:ring-blue-9'
];
