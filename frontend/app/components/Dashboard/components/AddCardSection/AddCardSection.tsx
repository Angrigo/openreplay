import React from 'react';
import { FolderOutlined } from '@ant-design/icons';
import { Segmented } from 'antd';
import {
  LineChart,
  AlignStartVertical,
  ArrowUpDown,
  WifiOff,
  Turtle,
  FileStack,
  AppWindow,
  Combine,
  Users,
  Sparkles,
} from 'lucide-react';
import { Icon } from 'UI';
import FilterSeries from 'App/mstore/types/filterSeries';
import { useModal } from 'App/components/Modal';
import {
  CARD_LIST,
  CardType,
} from '../DashboardList/NewDashModal/ExampleCards';
import { useStore } from 'App/mstore';
import {
  HEATMAP,
  FUNNEL,
  TABLE,
  TIMESERIES,
  USER_PATH,
} from 'App/constants/card';
import { useHistory } from 'react-router-dom';
import { dashboardMetricCreate, withSiteId, metricCreate } from 'App/routes';
import { FilterKey } from 'Types/filter/filterType';
import MetricsLibraryModal from '../MetricsLibraryModal/MetricsLibraryModal';
import { observer } from 'mobx-react-lite';

interface TabItem {
  icon: React.ReactNode;
  title: string;
  description: string;
  type: string;
}
const tabItems: Record<string, TabItem[]> = {
  product_analytics: [
    {
      icon: <LineChart width={16} />,
      title: 'Trends',
      type: TIMESERIES,
      description: 'Track session trends over time.',
    },
    {
      icon: <AlignStartVertical width={16} />,
      title: 'Funnels',
      type: FUNNEL,
      description: 'Visualize user progression through critical steps.',
    },
    {
      icon: (
        <Icon name={'dashboards/user-journey'} color={'inherit'} size={16} />
      ),
      title: 'Journeys',
      type: USER_PATH,
      description: 'Understand the paths users take through your product.',
    },
    // { TODO: 1.23+
    //   icon: <Icon name={'dashboards/cohort-chart'} color={'inherit'} size={16} />,
    //   title: 'Retention',
    //   type: RETENTION,
    //   description: 'Analyze user retention over specific time periods.',
    // },
    {
      icon: <Icon name={'dashboards/heatmap-2'} color={'inherit'} size={16} />,
      title: 'Heatmaps',
      type: HEATMAP,
      description: 'Visualize user interaction patterns on your pages.',
    },
  ],
  monitors: [
    {
      icon: (
        <Icon name={'dashboards/circle-alert'} color={'inherit'} size={16} />
      ),
      title: 'JS Errors',
      type: FilterKey.ERRORS,
      description: 'Monitor JS errors affecting user experience.',
    },
    {
      icon: <ArrowUpDown width={16} />,
      title: 'Top Network Requests',
      type: FilterKey.FETCH,
      description: 'Identify the most frequent network requests.',
    },
    {
      icon: <WifiOff width={16} />,
      title: '4xx/5xx Requests',
      type: TIMESERIES + '_4xx_requests',
      description: 'Track client and server errors for performance issues.',
    },
    {
      icon: <Turtle width={16} />,
      title: 'Slow Network Requests',
      type: TIMESERIES + '_slow_network_requests',
      description: 'Pinpoint the slowest network requests causing delays.',
    },
  ],
  web_analytics: [
    {
      icon: <FileStack width={16} />,
      title: 'Top Pages',
      type: FilterKey.LOCATION,
      description: 'Discover the most visited pages on your site.',
    },
    {
      icon: <AppWindow width={16} />,
      title: 'Top Browsers',
      type: FilterKey.USER_BROWSER,
      description: 'Analyze the browsers your visitors are using the most.',
    },
    {
      icon: <Combine width={16} />,
      title: 'Top Referrer',
      type: FilterKey.REFERRER,
      description: 'See where your traffic is coming from.',
    },
    {
      icon: <Users width={16} />,
      title: 'Top Users',
      type: FilterKey.USERID,
      description: 'Identify the users with the most interactions.',
    },
    // { TODO: 1.23+ maybe
    //   icon: <ArrowDown10 width={16} />,
    //   title: 'Speed Index by Country',
    //   type: TABLE,
    //   description: 'Measure performance across different regions.',
    // },
  ],
};

function CategoryTab({ tab, inCards }: { tab: string; inCards?: boolean }) {
  const items = tabItems[tab];
  const { metricStore, projectsStore, dashboardStore } = useStore();
  const history = useHistory();

  const handleCardSelection = (card: string) => {
    metricStore.init();
    const selectedCard = CARD_LIST.find((c) => c.key === card) as CardType;
    const cardData: any = {
      metricType: selectedCard.cardType,
      name: selectedCard.title,
      metricOf: selectedCard.metricOf,
    };

    if (selectedCard.filters) {
      cardData.series = [
        new FilterSeries().fromJson({
          name: 'Series 1',
          filter: {
            filters: selectedCard.filters,
          },
        }),
      ];
    }

    // TODO This code here makes 0 sense
    if (selectedCard.cardType === FUNNEL) {
      cardData.series = [];
      cardData.series.filter = [];
    }

    metricStore.merge(cardData);
    metricStore.instance.resetDefaults();

    if (projectsStore.activeSiteId) {
      if (inCards) {
        history.push(withSiteId(metricCreate(), projectsStore.activeSiteId));
      } else if (dashboardStore.selectedDashboard) {
        history.push(
          withSiteId(
            dashboardMetricCreate(dashboardStore.selectedDashboard.dashboardId),
            projectsStore.activeSiteId
          )
        );
      }
    }
  };
  return (
    <div className={'flex flex-col'}>
      {items.map((item, index) => (
        <div
          onClick={() => handleCardSelection(item.type)}
          key={index}
          className={
            'flex items-start gap-2 p-2 hover:bg-active-blue rounded-xl hover:text-blue group cursor-pointer'
          }
        >
          {item.icon}
          <div className={'leading-none'}>
            <div>{item.title}</div>
            <div className={'text-disabled-text group-hover:text-blue text-sm'}>
              {item.description}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const AddCardSection = observer(({ inCards }: { inCards?: boolean }) => {
  const { showModal } = useModal();
  const { metricStore, dashboardStore, projectsStore } = useStore();
  const [tab, setTab] = React.useState('product_analytics');
  const options = [
    { label: 'Product Analytics', value: 'product_analytics' },
    { label: 'Monitors', value: 'monitors' },
    { label: 'Web Analytics', value: 'web_analytics' },
  ];

  const originStr = window.env.ORIGIN || window.location.origin;
  const isSaas = /api\.openreplay\.com/.test(originStr);
  const onExistingClick = () => {
    const dashboardId = dashboardStore.selectedDashboard?.dashboardId;
    const siteId = projectsStore.activeSiteId;
    showModal(
      <MetricsLibraryModal siteId={siteId} dashboardId={dashboardId} />,
      {
        right: true,
        width: 800,
        onClose: () => {
          metricStore.updateKey('metricsSearch', '');
        },
      }
    );
  };
  return (
    <div
      className={
        'py-8 px-8 rounded-xl bg-white border border-gray-lighter flex flex-col gap-4'
      }
      style={{ width: 520, height: 400 }}
    >
      <div
        className={'flex justify-between border-b border-b-gray-lighter p-2'}
      >
        <div className={'font-semibold text-lg'}>Add a card to dashboard</div>
        {isSaas ? (
          <div
            className={'font-semibold flex items-center gap-2 cursor-pointer'}
          >
            <Sparkles color={'#3C00FFD8'} size={16} />
            <div className={'ai-gradient'}>Ask AI</div>
          </div>
        ) : null}
      </div>
      <div>
        <Segmented
          options={options}
          value={tab}
          onChange={(value) => setTab(value)}
        />
      </div>
      <CategoryTab tab={tab} inCards={inCards} />
      <div
        className={
          'w-full flex items-center justify-center border-t mt-auto border-t-gray-lighter gap-2 pt-2 cursor-pointer'
        }
      >
        <FolderOutlined />
        <div className={'font-semibold'} onClick={onExistingClick}>
          Add existing card
        </div>
      </div>
    </div>
  );
});

export default AddCardSection;
