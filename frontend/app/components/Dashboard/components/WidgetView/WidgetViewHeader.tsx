import React from 'react';
import cn from "classnames";
import WidgetName from "Components/Dashboard/components/WidgetName";
import {useStore} from "App/mstore";
import {useObserver} from "mobx-react-lite";
import AddToDashboardButton from "Components/Dashboard/components/AddToDashboardButton";
import {Button, Space} from "antd";
import CardViewMenu from "Components/Dashboard/components/WidgetView/CardViewMenu";

interface Props {
    onClick?: () => void;
    onSave: () => void;
    undoChanges?: () => void;
}

function WidgetViewHeader({onClick, onSave, undoChanges}: Props) {
    const {metricStore, dashboardStore} = useStore();
    const widget = useObserver(() => metricStore.instance);

    return (
        <div
            className={cn('flex justify-between items-center')}
            onClick={onClick}
        >
            <h1 className="mb-0 text-2xl mr-4 min-w-fit">
                <WidgetName name={widget.name}
                            onUpdate={(name) => metricStore.merge({name})}
                            canEdit={true}
                />
            </h1>
            <Space>
                <AddToDashboardButton metricId={widget.metricId}/>
                <Button
                    type="primary"
                    onClick={onSave}
                    loading={metricStore.isSaving}
                    disabled={metricStore.isSaving || !widget.hasChanged}
                >
                    Update
                </Button>
                <CardViewMenu/>
            </Space>
        </div>
    );
}

export default WidgetViewHeader;
