#!/usr/bin/env python
# -*- coding: utf-8 -*-
# Copyright 2017 Amazon.com, Inc. or its affiliates

# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at

# http://www.apache.org/licenses/LICENSE-2.0

# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

from __future__ import absolute_import, division, print_function

import json
import logging
import os

import click
import boto3
from xml.etree import ElementTree
from urllib.parse import urlencode

# Before connecting to MTurk, set up your AWS account and IAM settings as
# described here:
# https://blog.mturk.com/how-to-use-iam-to-control-api-access-to-your-mturk-account-76fe2c2e66e2
#
# Follow AWS best practices for setting up credentials here:
# http://boto3.readthedocs.io/en/latest/guide/configuration.html

# Use the Amazon Mechanical Turk Sandbox to publish test Human Intelligence
# Tasks (HITs) without paying any money.  Sign up for a Sandbox account at
# https://requestersandbox.mturk.com/ with the same credentials as your main
# MTurk account.

# Be sure to setup your config values before running this code. You can
# set them using environment variables.
ENDPOINT = os.getenv('MTURK_ENDPOINT')
PREVIEW = os.getenv('MTURK_PREVIEW')
REWARD = os.getenv('MTURK_REWARD')

task_url = 'https://ywkim.github.io/turk/index.html'

languages = {
    'ko': 'Korean',
    'ru': 'Russian',
    'fr': 'French',
    'it': 'Italian',
    'es': 'Spanish',
    'pt': 'Portuguese'
}

logging.getLogger().setLevel(logging.INFO)

# use profile if one was passed as an arg, otherwise
session = boto3.Session()
client = session.client(
    service_name='mturk',
    region_name='us-east-1',
    endpoint_url=ENDPOINT,
)

# Test that you can connect to the API by checking your account balance
user_balance = client.get_account_balance()

# In Sandbox this always returns $10,000. In live, it will be your acutal
# balance.
logging.info('Your account balance is {}'.format(
    user_balance['AvailableBalance']))

# The question we ask the workers is contained in this file.
# Example of using qualification to restrict responses to Workers who have had
# at least 80% of their assignments approved. See:
# http://docs.aws.amazon.com/AWSMechTurk/latest/AWSMturkAPI/ApiReference_QualificationRequirementDataStructureArticle.html#ApiReference_QualificationType-IDs
worker_requirements = [{
    'QualificationTypeId': '000000000000000000L0',
    'Comparator': 'GreaterThanOrEqualTo',
    'IntegerValues': [80],
    'RequiredToPreview': True,
}]


def publish_tasks(user_says, language):

    # Create the Hit type
    response = client.create_hit_type(
        AutoApprovalDelayInSeconds=60,
        AssignmentDurationInSeconds=600,
        Reward=REWARD,
        Title='English to {} Conversation Sentence Translation'.format(
            languages[language]),
        Keywords='translation, chatbot, v14',
        Description=
        'This HIT will require you to translate from English conversation sentences into {}.'.
        format(languages[language]),
        QualificationRequirements=worker_requirements)

    hit_type_id = response['HITTypeId']

    tasks = [
        publish_task(hit_type_id, user_say, language) for user_say in user_says
    ]

    logging.info('\nYou can work the {} HIT here:'.format(languages[language]))
    logging.info(PREVIEW + '?groupId={}'.format(hit_type_id))

    return tasks


def publish_task(hit_type_id, user_say, language):
    query = {'userSay': json.dumps(user_say), 'language': language}
    external_url = task_url + '?' + urlencode(query)
    xml = ElementTree.Element(
        'ExternalQuestion',
        xmlns=
        'http://mechanicalturk.amazonaws.com/AWSMechanicalTurkDataSchemas/2006-07-14/ExternalQuestion.xsd'
    )
    ElementTree.SubElement(xml, 'ExternalURL').text = external_url
    ElementTree.SubElement(xml, 'FrameHeight').text = '720'
    question = ElementTree.tostring(xml).decode()
    # Create the HIT
    response = client.create_hit_with_hit_type(
        HITTypeId=hit_type_id,
        MaxAssignments=2,
        LifetimeInSeconds=86400,
        Question=question)

    # The response included several fields that will be helpful later
    assert hit_type_id == response['HIT']['HITTypeId']
    hit_id = response['HIT']['HITId']
    logging.info('\nCreated HIT: {}'.format(hit_id))

    return {'id': user_say['id'], 'HITId': hit_id}


@click.command()
@click.argument('filename')
@click.option('--verbose/--no-verbose', default=False)
def publish(filename, verbose):
    if verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    suffix = '_usersays_en.json'
    assert filename.endswith(suffix)

    with open(filename, encoding='utf-8') as f:
        user_says = json.load(f)

        for language in languages:
            task_filename = '{}_tasks_{}.json'.format(filename[:-len(suffix)],
                                                      language)
            with open(task_filename, 'w', encoding='utf-8') as w:
                tasks = publish_tasks(user_says, language)
                json.dump(tasks, w, indent=4)


if __name__ == '__main__':
    publish()
